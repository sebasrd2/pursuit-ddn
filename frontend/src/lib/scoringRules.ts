import type { Importance, Threshold, ThresholdBand } from '../api/types'

// Spec §4.3 — mirrors backend/src/services/scoring.ts; keep the two in sync.

export const IMPORTANCE_MULTIPLIER: Record<Importance, number> = { low: 1, medium: 2, high: 3 }

export const THRESHOLD_BANDS: Record<Threshold, ThresholdBand> = {
  conservative: { bid: 80, conditionalLow: 60, conditionalHigh: 79 },
  balanced: { bid: 65, conditionalLow: 45, conditionalHigh: 64 },
  aggressive: { bid: 50, conditionalLow: 35, conditionalHigh: 49 },
}

export const THRESHOLD_MEANING: Record<Threshold, string> = {
  conservative: 'Recommend a bid only for a strong, well-covered fit.',
  balanced: 'The default trade-off between fit and opportunity.',
  aggressive: 'Recommend bidding more often, accepting some gaps in fit or coverage.',
}

/** One-line summary of a threshold's bands, e.g. "Bid ≥ 65 · Conditional 45–64 · No-bid < 45". */
export function describeBands(threshold: Threshold): string {
  const band = THRESHOLD_BANDS[threshold]
  return `Bid ≥ ${band.bid} · Conditional ${band.conditionalLow}–${band.conditionalHigh} · No-bid < ${band.conditionalLow}`
}
