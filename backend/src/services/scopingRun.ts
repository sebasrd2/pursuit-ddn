import type Database from 'better-sqlite3'
import type { TextProvider } from '../ai/textProvider.js'
import type { EmbedProvider } from '../ai/embedProvider.js'
import { cachedGenerate } from '../ai/cache.js'
import { listQuestionRows } from '../repositories/questions.js'
import { listBidCriterionRows } from '../repositories/bidCriteria.js'
import { getThreshold } from '../repositories/scopingSettings.js'
import { saveScopingRun } from '../repositories/scopingRuns.js'
import { retrieveForQuestions } from '../knowledge/retrieve.js'
import { buildCriterionPrompt, buildDisqualifierPrompt } from '../prompts/scoping.js'
import { toBidCriterionView } from './views.js'
import { scoreCriteria, recommend, type ScopingProfileEntry } from './scoring.js'
import type { CriterionResult, Threshold } from '../types.js'

/** Evidence budget for a scoping run: best passages per question, capped to keep prompts bounded. */
const PASSAGES_PER_QUESTION = 2
const MAX_SCOPING_PASSAGES = 40

function buildRfpSummary(questions: { question_text: string }[]): string {
  if (questions.length === 0) return '(No questions have been imported yet.)'
  return questions.map((q) => `- ${q.question_text}`).join('\n')
}

interface CriterionAssessmentResponse {
  assessment?: string
  evidence?: string | null
  reasoning?: string
}

interface DisqualifierResponse {
  triggered?: boolean
  evidence?: string | null
  reasoning?: string
}

function isValidAssessment(value: unknown): value is 'strong' | 'partial' | 'weak' | 'not_assessed' {
  return value === 'strong' || value === 'partial' || value === 'weak' || value === 'not_assessed'
}

/** Runs a full scoping assessment against every enabled criterion (spec §3.3). */
export async function runScoping(
  db: Database.Database,
  textProvider: TextProvider,
  embedProvider: EmbedProvider,
  rfpId: string,
): Promise<{ criteria: CriterionResult[]; disqualifierTriggered: boolean; overallScore: number | null; threshold: Threshold; recommendation: ReturnType<typeof recommend> }> {
  const questionRows = listQuestionRows(db, rfpId)
  const rfpSummary = buildRfpSummary(questionRows)
  const criteria = listBidCriterionRows(db).map(toBidCriterionView)
  const threshold = getThreshold(db) as Threshold
  const passages = await retrieveForQuestions(
    db,
    embedProvider,
    questionRows.map((q) => q.question_text),
    PASSAGES_PER_QUESTION,
    MAX_SCOPING_PASSAGES,
  )

  const scored = criteria.filter((c) => !c.isDisqualifier)
  const disqualifier = criteria.find((c) => c.isDisqualifier)

  const profile: Record<string, ScopingProfileEntry> = {}

  for (const criterion of scored) {
    if (!criterion.enabled) continue

    const { systemPrompt, userPrompt } = buildCriterionPrompt({
      criterionName: criterion.name,
      criterionDescription: criterion.description,
      rfpSummary,
      passages,
    })

    const response = (await cachedGenerate(db, [textProvider.model, systemPrompt, userPrompt], () =>
      textProvider.generateJson(systemPrompt, userPrompt),
    )) as CriterionAssessmentResponse

    profile[criterion.key] = {
      assessment: isValidAssessment(response.assessment) ? response.assessment : 'not_assessed',
      evidence: response.evidence ?? null,
      reasoning: response.reasoning ?? 'No supporting evidence was found for this criterion.',
    }
  }

  const { results, score } = scoreCriteria(criteria, profile)

  let disqualifierTriggered = false
  const criteriaWithDisqualifier = [...results]
  if (disqualifier) {
    let disqualifierResult: CriterionResult
    if (!disqualifier.enabled) {
      disqualifierResult = {
        criterionId: disqualifier.id,
        name: disqualifier.name,
        description: disqualifier.description,
        enabled: false,
        importance: null,
        isDisqualifier: true,
        assessment: 'not_triggered',
        points: null,
        evidence: null,
        reasoning: 'Disqualifier check is disabled.',
      }
    } else {
      const { systemPrompt, userPrompt } = buildDisqualifierPrompt({ rfpSummary, passages })
      const response = (await cachedGenerate(db, [textProvider.model, systemPrompt, userPrompt], () =>
        textProvider.generateJson(systemPrompt, userPrompt),
      )) as DisqualifierResponse

      disqualifierTriggered = response.triggered === true
      disqualifierResult = {
        criterionId: disqualifier.id,
        name: disqualifier.name,
        description: disqualifier.description,
        enabled: true,
        importance: null,
        isDisqualifier: true,
        assessment: disqualifierTriggered ? 'triggered' : 'not_triggered',
        points: null,
        evidence: response.evidence ?? null,
        reasoning: response.reasoning ?? 'No disqualifying requirement was found.',
      }
    }
    criteriaWithDisqualifier.push(disqualifierResult)
  }

  const recommendation = recommend(score, threshold, disqualifierTriggered)

  saveScopingRun(db, {
    rfpId,
    criteria: criteriaWithDisqualifier,
    disqualifierTriggered,
    overallScore: score,
    threshold,
    recommendation,
  })

  return { criteria: criteriaWithDisqualifier, disqualifierTriggered, overallScore: score, threshold, recommendation }
}
