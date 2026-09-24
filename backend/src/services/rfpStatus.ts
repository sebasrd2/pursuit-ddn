import type Database from 'better-sqlite3'
import type { RfpStatus } from '../types.js'
import { getRfpRow, updateRfpRow } from '../repositories/rfps.js'
import { getQuestionCounts } from '../repositories/questions.js'

// The linear "bid" path or automatic advancement (spec §5.1). `no_bid` is a separate
// terminal branch handled outside this order, and `complete` is never set automatically.
const BID_PATH_ORDER: RfpStatus[] = ['draft', 'scoping', 'in_progress', 'in_review', 'complete']

/**
 * Advances `current` to `target` only if that's forward progress along the bid path, so an
 * automatic transition never regresses a status the user (or a later automatic step) already
 * moved past. `no_bid` always wins outright since it's terminal.
 */
export function autoAdvanceStatus(current: RfpStatus, target: RfpStatus): RfpStatus {
  if (target === 'no_bid') return 'no_bid'
  if (current === 'no_bid') return current

  const currentIndex = BID_PATH_ORDER.indexOf(current)
  const targetIndex = BID_PATH_ORDER.indexOf(target)
  if (currentIndex === -1 || targetIndex === -1) return current

  return targetIndex > currentIndex ? target : current
}

/**
 * Advances an RFP to `in_review` once no question is `unanswered` (spec §5.1). Called after
 * any question mutation that could be the one making that true — answering (single or all),
 * bulk update, or a manual status edit — regardless of which entry point caused it.
 */
export function maybeAdvanceToInReview(db: Database.Database, rfpId: string): void {
  const rfp = getRfpRow(db, rfpId)
  if (!rfp) return

  const counts = getQuestionCounts(db, rfpId)
  if (counts.total === 0 || counts.unanswered > 0) return

  const nextStatus = autoAdvanceStatus(rfp.status as RfpStatus, 'in_review')
  if (nextStatus !== rfp.status) {
    updateRfpRow(db, rfpId, { status: nextStatus })
  }
}
