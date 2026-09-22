import { describe, expect, it } from 'vitest'
import type { BidCriterion } from '../api/types'
import { recommend, scoreCriteria, THRESHOLD_BANDS, type ScopingProfileEntry } from './scoring'

const criteria: BidCriterion[] = [
  { id: 'c1', key: 'a', name: 'A', description: '', enabled: true, importance: 'high', isDisqualifier: false },
  { id: 'c2', key: 'b', name: 'B', description: '', enabled: true, importance: 'low', isDisqualifier: false },
  { id: 'c3', key: 'c', name: 'C', description: '', enabled: false, importance: 'high', isDisqualifier: false },
]

describe('scoreCriteria', () => {
  it('weights points by importance multiplier and excludes not-assessed criteria', () => {
    const profile: Record<string, ScopingProfileEntry> = {
      a: { assessment: 'strong', evidence: null, reasoning: '' }, // 2 pts * 3 = 6 of 6
      b: { assessment: 'partial', evidence: null, reasoning: '' }, // 1 pt * 1 = 1 of 2
    }
    const { score } = scoreCriteria(criteria, profile)
    // (6 + 1) / (6 + 2) * 100 = 87.5 -> rounds to 88
    expect(score).toBe(88)
  })

  it('excludes disabled criteria from the score even when assessed', () => {
    const profile: Record<string, ScopingProfileEntry> = {
      a: { assessment: 'strong', evidence: null, reasoning: '' },
      c: { assessment: 'strong', evidence: null, reasoning: '' }, // disabled, must not count
    }
    const { score } = scoreCriteria(criteria, profile)
    expect(score).toBe(100) // only 'a' counted: 6/6
  })

  it('returns a null score when nothing was assessed', () => {
    const { score } = scoreCriteria(criteria, {})
    expect(score).toBeNull()
  })
})

describe('recommend', () => {
  it('recommends no-bid when the disqualifier is triggered regardless of score', () => {
    expect(recommend(95, 'balanced', true)).toBe('no_bid')
  })

  it.each([
    ['conservative', 80, 'bid'],
    ['conservative', 79, 'conditional'],
    ['conservative', 59, 'no_bid'],
    ['balanced', 65, 'bid'],
    ['balanced', 45, 'conditional'],
    ['balanced', 44, 'no_bid'],
    ['aggressive', 50, 'bid'],
    ['aggressive', 35, 'conditional'],
    ['aggressive', 34, 'no_bid'],
  ] as const)('%s threshold at score %i recommends %s', (threshold, score, expected) => {
    expect(recommend(score, threshold, false)).toBe(expected)
  })

  it('has the exact bands from the spec for every threshold', () => {
    expect(THRESHOLD_BANDS.conservative).toEqual({ bid: 80, conditionalLow: 60, conditionalHigh: 79 })
    expect(THRESHOLD_BANDS.balanced).toEqual({ bid: 65, conditionalLow: 45, conditionalHigh: 64 })
    expect(THRESHOLD_BANDS.aggressive).toEqual({ bid: 50, conditionalLow: 35, conditionalHigh: 49 })
  })
})
