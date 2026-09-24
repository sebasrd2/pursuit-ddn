// Implements spec §4.3 exactly. Ported from frontend/src/mocks/scoring.ts, which already
// matches the spec and has passing tests — keep the two in sync if the formula ever changes.

import type { BidCriterion, CriterionAssessment, CriterionResult, Recommendation, Threshold, ThresholdBand } from '../types.js'

const POINTS: Record<CriterionAssessment, number | null> = {
  strong: 2,
  partial: 1,
  weak: 0,
  not_assessed: null,
}

const IMPORTANCE_MULTIPLIER = { low: 1, medium: 2, high: 3 } as const

export const THRESHOLD_BANDS: Record<Threshold, ThresholdBand> = {
  conservative: { bid: 80, conditionalLow: 60, conditionalHigh: 79 },
  balanced: { bid: 65, conditionalLow: 45, conditionalHigh: 64 },
  aggressive: { bid: 50, conditionalLow: 35, conditionalHigh: 49 },
}

export interface ScopingProfileEntry {
  assessment: CriterionAssessment
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

export function recommend(score: number | null, threshold: Threshold, disqualifierTriggered: boolean): Recommendation {
  if (disqualifierTriggered) return 'no_bid'
  if (score === null) return 'no_bid'

  const band = THRESHOLD_BANDS[threshold]
  if (score >= band.bid) return 'bid'
  if (score >= band.conditionalLow) return 'conditional'
  return 'no_bid'
}
