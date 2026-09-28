import { describe, expect, it } from 'vitest'
import type { Rfp } from '../api/types'
import { computeRfpStats } from './rfpStats'

const today = new Date(2026, 8, 28)

function makeRfp(overrides: Partial<Rfp>): Rfp {
  return {
    id: 'rfp',
    name: 'RFP',
    customer: 'Customer',
    dueDate: null,
    status: 'draft',
    decision: null,
    decisionRationale: null,
    sourceFileName: null,
    notes: null,
    currentStage: 1,
    currentStageName: 'Import',
    questionCounts: { total: 0, unanswered: 0, needsInput: 0, aiAnswered: 0, inReview: 0, approved: 0, notApplicable: 0 },
    categoryCount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeRfpStats', () => {
  const rfps = [
    makeRfp({ id: 'a', status: 'in_review', decision: 'bid', dueDate: '2026-10-08' }),
    makeRfp({ id: 'b', status: 'complete', decision: 'bid', dueDate: '2026-10-07', updatedAt: '2026-09-24T19:00:00.000Z' }),
    makeRfp({ id: 'c', status: 'scoping', dueDate: '2026-10-06' }),
    makeRfp({ id: 'd', status: 'no_bid', decision: 'no_bid', dueDate: '2026-10-01' }),
    makeRfp({ id: 'e', status: 'in_progress', decision: 'bid', dueDate: '2026-09-20' }),
    makeRfp({ id: 'f', status: 'draft', dueDate: '2026-12-31' }),
    makeRfp({ id: 'g', status: 'complete', decision: 'bid', updatedAt: '2026-08-15T00:00:00.000Z' }),
  ]
  const stats = computeRfpStats(rfps, today)

  it('counts open pursuits and completions this month', () => {
    expect(stats.open).toBe(4)
    expect(stats.completeThisMonth).toBe(1)
  })

  it('counts open RFPs due within 14 days, excluding overdue and closed ones', () => {
    expect(stats.dueSoon).toBe(2)
    expect(stats.nextDue?.id).toBe('c')
  })

  it('computes the bid rate over decided RFPs', () => {
    expect(stats.decided).toBe(5)
    expect(stats.bids).toBe(4)
  })

  it('lists undecided, non-no-bid RFPs soonest first', () => {
    expect(stats.awaitingDecision).toBe(2)
    expect(stats.nextAwaiting?.id).toBe('c')
  })

  it('handles an empty list', () => {
    expect(computeRfpStats([], today)).toMatchObject({ open: 0, nextDue: null, decided: 0, nextAwaiting: null })
  })
})
