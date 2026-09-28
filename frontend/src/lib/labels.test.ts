import { describe, expect, it } from 'vitest'
import { daysUntil, formatDate } from './labels'

describe('formatDate', () => {
  it('shows a date-only value as that calendar day in any time zone', () => {
    expect(formatDate('2026-10-09')).toContain('9')
    expect(formatDate('2026-10-09')).not.toContain('8')
  })

  it('shows a dash for missing or invalid values', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not a date')).toBe('—')
  })
})

describe('daysUntil', () => {
  const today = new Date(2026, 8, 28, 15, 30)

  it('counts whole calendar days from today', () => {
    expect(daysUntil('2026-10-06', today)).toBe(8)
    expect(daysUntil('2026-09-28', today)).toBe(0)
    expect(daysUntil('2026-09-25', today)).toBe(-3)
  })

  it('returns null without a due date', () => {
    expect(daysUntil(null, today)).toBeNull()
  })
})
