import type { Rfp } from '../api/types'
import { daysUntil, parseDate } from './labels'

export const DUE_SOON_DAYS = 14

export interface RfpStats {
  open: number
  completeThisMonth: number
  dueSoon: number
  /** The open RFP due soonest from today onwards, within the due-soon window. */
  nextDue: Rfp | null
  decided: number
  bids: number
  awaitingDecision: number
  /** The undecided RFP due soonest (undated ones last). */
  nextAwaiting: Rfp | null
}

/** Dashboard KPIs for the RFP list, derived from the list itself (no extra API call). */
export function computeRfpStats(rfps: Rfp[], today: Date): RfpStats {
  const open = rfps.filter((rfp) => rfp.status !== 'complete' && rfp.status !== 'no_bid')
  const dueSoon = byDueDate(
    open.filter((rfp) => {
      const days = daysUntil(rfp.dueDate, today)
      return days !== null && days >= 0 && days <= DUE_SOON_DAYS
    }),
  )
  const decided = rfps.filter((rfp) => rfp.decision !== null)
  const awaiting = byDueDate(rfps.filter((rfp) => rfp.decision === null && rfp.status !== 'no_bid'))

  return {
    open: open.length,
    completeThisMonth: rfps.filter((rfp) => rfp.status === 'complete' && isSameMonth(rfp.updatedAt, today)).length,
    dueSoon: dueSoon.length,
    nextDue: dueSoon[0] ?? null,
    decided: decided.length,
    bids: decided.filter((rfp) => rfp.decision === 'bid').length,
    awaitingDecision: awaiting.length,
    nextAwaiting: awaiting[0] ?? null,
  }
}

function byDueDate(rfps: Rfp[]): Rfp[] {
  return [...rfps].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
}

function isSameMonth(value: string, today: Date): boolean {
  const date = parseDate(value)
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
}
