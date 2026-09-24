import type Database from 'better-sqlite3'

export interface BidCriterionRow {
  id: string
  key: string
  name: string
  description: string
  enabled: number
  importance: string | null
  is_disqualifier: number
  display_order: number
}

export function listBidCriterionRows(db: Database.Database): BidCriterionRow[] {
  return db.prepare('SELECT * FROM bid_criteria ORDER BY display_order').all() as BidCriterionRow[]
}

export function getBidCriterionRow(db: Database.Database, id: string): BidCriterionRow | undefined {
  return db.prepare('SELECT * FROM bid_criteria WHERE id = ?').get(id) as BidCriterionRow | undefined
}

export interface UpdateBidCriterionInput {
  enabled?: boolean
  importance?: string
}

export function updateBidCriterionRow(
  db: Database.Database,
  id: string,
  input: UpdateBidCriterionInput,
): BidCriterionRow | undefined {
  const sets: string[] = []
  const values: unknown[] = []
  if (input.enabled !== undefined) {
    sets.push('enabled = ?')
    values.push(input.enabled ? 1 : 0)
  }
  if (input.importance !== undefined) {
    sets.push('importance = ?')
    values.push(input.importance)
  }
  if (sets.length === 0) return getBidCriterionRow(db, id)

  values.push(id)
  db.prepare(`UPDATE bid_criteria SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return getBidCriterionRow(db, id)
}
