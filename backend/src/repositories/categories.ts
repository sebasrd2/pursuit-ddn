import type Database from 'better-sqlite3'
import crypto from 'node:crypto'

export interface CategoryRow {
  id: string
  rfp_id: string
  name: string
  display_order: number
}

export function listCategoryRows(db: Database.Database, rfpId: string): CategoryRow[] {
  return db
    .prepare('SELECT * FROM categories WHERE rfp_id = ? ORDER BY display_order')
    .all(rfpId) as CategoryRow[]
}

export function getCategoryRow(db: Database.Database, id: string): CategoryRow | undefined {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined
}

export function findCategoryByName(db: Database.Database, rfpId: string, name: string): CategoryRow | undefined {
  return db
    .prepare('SELECT * FROM categories WHERE rfp_id = ? AND name = ?')
    .get(rfpId, name) as CategoryRow | undefined
}

export function insertCategoryRow(db: Database.Database, rfpId: string, name: string): CategoryRow {
  const existingCount = (
    db.prepare('SELECT COUNT(*) AS n FROM categories WHERE rfp_id = ?').get(rfpId) as { n: number }
  ).n
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO categories (id, rfp_id, name, display_order) VALUES (?, ?, ?, ?)').run(
    id,
    rfpId,
    name,
    existingCount,
  )
  return { id, rfp_id: rfpId, name, display_order: existingCount }
}

/** Finds the category by name, creating it (at the next display order) if it doesn't exist yet. */
export function findOrCreateCategory(db: Database.Database, rfpId: string, name: string): CategoryRow {
  return findCategoryByName(db, rfpId, name) ?? insertCategoryRow(db, rfpId, name)
}
