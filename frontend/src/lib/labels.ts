import type { QuestionStatus, Recommendation, RfpStatus } from '../api/types'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'ink'

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  unanswered: 'Unanswered',
  needs_input: 'Needs input',
  ai_answered: 'AI answered',
  in_review: 'In review',
  approved: 'Approved',
  not_applicable: 'Not applicable',
}

export const QUESTION_STATUS_TONE: Record<QuestionStatus, Tone> = {
  unanswered: 'neutral',
  needs_input: 'danger',
  ai_answered: 'warning',
  in_review: 'warning',
  approved: 'success',
  not_applicable: 'neutral',
}

export const RFP_STATUS_LABEL: Record<RfpStatus, string> = {
  draft: 'Draft',
  scoping: 'Scoping',
  no_bid: 'No-bid',
  in_progress: 'In progress',
  in_review: 'In review',
  complete: 'Complete',
}

export const RFP_STATUS_TONE: Record<RfpStatus, Tone> = {
  draft: 'neutral',
  scoping: 'warning',
  no_bid: 'danger',
  in_progress: 'warning',
  in_review: 'warning',
  complete: 'success',
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  bid: 'Bid',
  conditional: 'Conditional',
  no_bid: 'No-bid',
}

export const RECOMMENDATION_TONE: Record<Recommendation, Tone> = {
  bid: 'success',
  conditional: 'warning',
  no_bid: 'danger',
}

/**
 * Parses an API date. Date-only values ("2026-10-09") are read as local calendar days —
 * `new Date()` would treat them as UTC midnight, i.e. the previous day west of UTC.
 */
export function parseDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!dateOnly) return new Date(value)
  const [, year, month, day] = dateOnly
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Whole calendar days from `today` to `value` (negative when overdue), or null without a date. */
export function daysUntil(value: string | null, today: Date): number | null {
  if (!value) return null
  const due = parseDate(value)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due.getTime() - start.getTime()) / 86_400_000)
}
