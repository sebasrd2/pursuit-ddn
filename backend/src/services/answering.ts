import type Database from 'better-sqlite3'
import type { TextProvider } from '../ai/textProvider.js'
import type { EmbedProvider } from '../ai/embedProvider.js'
import { cachedGenerate } from '../ai/cache.js'
import { retrieve } from '../knowledge/retrieve.js'
import { buildAnswerPrompt } from '../prompts/answering.js'
import { listOwnerTeamRows } from '../repositories/ownerTeams.js'
import type { QuestionRow } from '../repositories/questions.js'
import type { AnswerSource, KnowledgePassage, QuestionStatus } from '../types.js'

interface AnswerResponse {
  confident?: boolean
  answer?: string
  citationDocumentTitle?: string | null
  citationHeading?: string | null
  gapNote?: string | null
  suggestedOwnerTeam?: string | null
}

export interface GeneratedAnswer {
  answerText: string
  citation: string | null
  status: QuestionStatus
  gapNote: string | null
  ownerTeamId: string | null
  answerSource: AnswerSource
}

function findMatchingOwnerTeam(db: Database.Database, suggested: string | null | undefined): string | null {
  if (!suggested) return null
  const teams = listOwnerTeamRows(db).filter((t) => t.active)
  const needle = suggested.trim().toLowerCase()
  const match = teams.find(
    (t) => t.name.toLowerCase() === needle || t.name.toLowerCase().includes(needle) || needle.includes(t.name.toLowerCase()),
  )
  return match?.id ?? null
}

/** Was the model's own claimed citation actually one of the passages it was given? Defense
 * against a hallucinated citation slipping past the confidence rule. */
function citationIsGrounded(response: AnswerResponse, passages: KnowledgePassage[]): boolean {
  if (!response.citationDocumentTitle) return false
  return passages.some((p) => p.documentTitle === response.citationDocumentTitle)
}

function formatCitation(response: AnswerResponse): string {
  return response.citationHeading
    ? `${response.citationDocumentTitle} — ${response.citationHeading}`
    : response.citationDocumentTitle!
}

/**
 * Enforces the confidence rule (spec §3.4): an answer is written only when generation
 * returns high confidence AND that confidence is grounded in an actual retrieved passage.
 * In every other case the answer stays empty and the question needs human input.
 */
export async function answerQuestion(
  db: Database.Database,
  textProvider: TextProvider,
  embedProvider: EmbedProvider,
  retrievalTopK: number,
  question: QuestionRow,
  instruction?: string,
): Promise<GeneratedAnswer> {
  const passages = await retrieve(db, embedProvider, question.question_text, retrievalTopK)

  if (passages.length === 0) {
    return {
      answerText: '',
      citation: null,
      status: 'needs_input',
      gapNote: `No supporting passage was found in the knowledge base for: "${question.question_text}"`,
      ownerTeamId: null,
      answerSource: null,
    }
  }

  const { systemPrompt, userPrompt } = buildAnswerPrompt({
    questionText: question.question_text,
    instruction,
    passages,
  })

  const response = (await cachedGenerate(db, [textProvider.model, systemPrompt, userPrompt], () =>
    textProvider.generateJson(systemPrompt, userPrompt),
  )) as AnswerResponse

  const grounded = citationIsGrounded(response, passages)
  const confident = response.confident === true && grounded && Boolean(response.answer?.trim())

  if (!confident) {
    return {
      answerText: '',
      citation: null,
      status: 'needs_input',
      gapNote:
        response.gapNote?.trim() ||
        `No supporting passage answers this with high confidence: "${question.question_text}"`,
      ownerTeamId: findMatchingOwnerTeam(db, response.suggestedOwnerTeam),
      answerSource: null,
    }
  }

  return {
    answerText: response.answer!.trim(),
    citation: formatCitation(response),
    status: 'ai_answered',
    gapNote: null,
    ownerTeamId: findMatchingOwnerTeam(db, response.suggestedOwnerTeam),
    answerSource: 'ai',
  }
}
