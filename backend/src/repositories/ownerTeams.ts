import type Database from 'better-sqlite3'
import crypto from 'node:crypto'

export interface OwnerTeamRow {
  id: string
  name: string
  is_default: number
  display_order: number
  active: number
}

export function listOwnerTeamRows(db: Database.Database): OwnerTeamRow[] {
  return db.prepare('SELECT * FROM owner_teams ORDER BY display_order').all() as OwnerTeamRow[]
}

export function getOwnerTeamRow(db: Database.Database, id: string): OwnerTeamRow | undefined {
  return db.prepare('SELECT * FROM owner_teams WHERE id = ?').get(id) as OwnerTeamRow | undefined
}

export function insertOwnerTeamRow(db: Database.Database, name: string): OwnerTeamRow {
  const existingCount = (db.prepare('SELECT COUNT(*) AS n FROM owner_teams').get() as { n: number }).n
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO owner_teams (id, name, is_default, display_order, active) VALUES (?, ?, 0, ?, 1)').run(
    id,
    name,
    existingCount,
  )
  return getOwnerTeamRow(db, id)!
}

export interface UpdateOwnerTeamInput {
  name?: string
  active?: boolean
  displayOrder?: number
}

export function updateOwnerTeamRow(
  db: Database.Database,
  id: string,
  input: UpdateOwnerTeamInput,
): OwnerTeamRow | undefined {
  const sets: string[] = []
  const values: unknown[] = []
  if (input.name !== undefined) {
    sets.push('name = ?')
    values.push(input.name)
  }
  if (input.active !== undefined) {
    sets.push('active = ?')
    values.push(input.active ? 1 : 0)
  }
  if (input.displayOrder !== undefined) {
    sets.push('display_order = ?')
    values.push(input.displayOrder)
  }
  if (sets.length === 0) return getOwnerTeamRow(db, id)

  values.push(id)
  db.prepare(`UPDATE owner_teams SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return getOwnerTeamRow(db, id)
}

export function deleteOwnerTeamRow(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM owner_teams WHERE id = ?').run(id)
  return result.changes > 0
}
