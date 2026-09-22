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

export function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
