import { describe, expect, it } from 'vitest'
import { deriveStage } from './stage.js'
import type { QuestionCounts } from '../types.js'

const zeroCounts: QuestionCounts = { total: 0, unanswered: 0, needsInput: 0, aiAnswered: 0, inReview: 0, approved: 0, notApplicable: 0 }

describe('deriveStage (spec §2)', () => {
  it('is Import when no questions exist yet', () => {
    expect(deriveStage({ decision: null, hasScopingResult: false, questionCount: 0, counts: zeroCounts })).toEqual({ stage: 1, name: 'Import' })
  })

  it('is Scoping once questions exist but no scoping result yet', () => {
    const counts = { ...zeroCounts, total: 3, unanswered: 3 }
    expect(deriveStage({ decision: null, hasScopingResult: false, questionCount: 3, counts })).toEqual({ stage: 2, name: 'Scoping' })
  })

  it('is Decision once scoped but no decision recorded', () => {
    const counts = { ...zeroCounts, total: 3, unanswered: 3 }
    expect(deriveStage({ decision: null, hasScopingResult: true, questionCount: 3, counts })).toEqual({ stage: 3, name: 'Decision' })
  })

  it('stays at Decision (terminal) for a no_bid RFP, never entering stages 4-6', () => {
    const counts = { ...zeroCounts, total: 3, unanswered: 3 }
    expect(deriveStage({ decision: 'no_bid', hasScopingResult: true, questionCount: 3, counts })).toEqual({ stage: 3, name: 'Decision' })
  })

  it('is Auto-answer once bid, while any question is unanswered', () => {
    const counts = { ...zeroCounts, total: 3, unanswered: 1, aiAnswered: 2 }
    expect(deriveStage({ decision: 'bid', hasScopingResult: true, questionCount: 3, counts })).toEqual({ stage: 4, name: 'Auto-answer' })
  })

  it('is Review once every question has been attempted but some need checking or input', () => {
    const counts = { ...zeroCounts, total: 3, aiAnswered: 2, needsInput: 1 }
    expect(deriveStage({ decision: 'bid', hasScopingResult: true, questionCount: 3, counts })).toEqual({ stage: 5, name: 'Review' })
  })

  it('is Export once every question is approved or not applicable', () => {
    const counts = { ...zeroCounts, total: 3, approved: 2, notApplicable: 1 }
    expect(deriveStage({ decision: 'bid', hasScopingResult: true, questionCount: 3, counts })).toEqual({ stage: 6, name: 'Export' })
  })
})
