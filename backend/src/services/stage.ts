import type { BidDecision, QuestionCounts } from '../types.js'

export const STAGES: ReadonlyArray<{ stage: number; name: string }> = [
  { stage: 1, name: 'Import' },
  { stage: 2, name: 'Scoping' },
  { stage: 3, name: 'Decision' },
  { stage: 4, name: 'Auto-answer' },
  { stage: 5, name: 'Review' },
  { stage: 6, name: 'Export' },
]

/** Derives the current stage from RFP and question state (spec §2). */
export function deriveStage(input: {
  decision: BidDecision
  hasScopingResult: boolean
  questionCount: number
  counts: QuestionCounts
}): { stage: number; name: string } {
  const { decision, hasScopingResult, questionCount, counts } = input

  let stage: number
  if (questionCount === 0) {
    stage = 1
  } else if (!hasScopingResult) {
    stage = 2
  } else if (decision === null) {
    stage = 3
  } else if (decision === 'no_bid') {
    // no_bid closes the RFP at the Decision stage — stages 4-6 are never entered (spec §3.3.9).
    stage = 3
  } else if (counts.unanswered > 0) {
    stage = 4
  } else if (counts.aiAnswered > 0 || counts.needsInput > 0) {
    stage = 5
  } else {
    stage = 6
  }

  return { stage, name: STAGES[stage - 1]!.name }
}
