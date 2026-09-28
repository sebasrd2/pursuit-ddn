import type { BidCriterion, CriterionAssessment, CriterionResult, Recommendation, Threshold } from '../api/types'
import { IMPORTANCE_MULTIPLIER, THRESHOLD_BANDS } from '../lib/scoringRules'

export { THRESHOLD_BANDS }

const POINTS: Record<CriterionAssessment, number | null> = {
  strong: 2,
  partial: 1,
  weak: 0,
  not_assessed: null,
}

export interface ScopingProfileEntry {
  assessment: CriterionAssessment
  evidence: string | null
  reasoning: string
}

export interface DisqualifierProfile {
  triggered: boolean
  evidence: string | null
  reasoning: string
}

export function scoreCriteria(
  criteria: BidCriterion[],
  profile: Record<string, ScopingProfileEntry>,
): { results: CriterionResult[]; score: number | null } {
  let weightedPoints = 0
  let weightedMax = 0
  const results: CriterionResult[] = []

  for (const criterion of criteria.filter((c) => !c.isDisqualifier)) {
    const entry = profile[criterion.key]
    const assessment = entry?.assessment ?? 'not_assessed'
    const points = POINTS[assessment]

    if (criterion.enabled && points !== null && criterion.importance) {
      const multiplier = IMPORTANCE_MULTIPLIER[criterion.importance]
      weightedPoints += points * multiplier
      weightedMax += 2 * multiplier
    }

    results.push({
      criterionId: criterion.id,
      name: criterion.name,
      description: criterion.description,
      enabled: criterion.enabled,
      importance: criterion.importance,
      isDisqualifier: false,
      assessment,
      points,
      evidence: entry?.evidence ?? null,
      reasoning: entry?.reasoning ?? 'No supporting evidence was found for this criterion.',
    })
  }

  const score = weightedMax > 0 ? Math.round((weightedPoints / weightedMax) * 100) : null
  return { results, score }
}

export function recommend(
  score: number | null,
  threshold: Threshold,
  disqualifierTriggered: boolean,
): Recommendation {
  if (disqualifierTriggered) return 'no_bid'
  if (score === null) return 'no_bid'

  const band = THRESHOLD_BANDS[threshold]
  if (score >= band.bid) return 'bid'
  if (score >= band.conditionalLow) return 'conditional'
  return 'no_bid'
}
