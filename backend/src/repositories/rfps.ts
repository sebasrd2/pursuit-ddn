import type Database from 'better-sqlite3'
import crypto from 'node:crypto'

export interface RfpRow {
  id: string
  name: string
  customer: string
  due_date: string | null
  status: string
  decision: string | null
  decision_rationale: string | null
  source_file_name: string | null
  source_file_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function listRfpRows(db: Database.Database): RfpRow[] {
  return db.prepare('SELECT * FROM rfps ORDER BY created_at DESC').all() as RfpRow[]
}

export function getRfpRow(db: Database.Database, id: string): RfpRow | undefined {
  return db.prepare('SELECT * FROM rfps WHERE id = ?').get(id) as RfpRow | undefined
}

export interface CreateRfpRowInput {
  name: string
  customer: string
  dueDate: string | null
  notes: string | null
  sourceFileName: string | null
  sourceFilePath: string | null
}

export function insertRfpRow(db: Database.Database, input: CreateRfpRowInput): RfpRow {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO rfps (id, name, customer, due_date, status, decision, decision_rationale,
                       source_file_name, source_file_path, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'draft', NULL, NULL, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.customer, input.dueDate, input.sourceFileName, input.sourceFilePath, input.notes, now, now)
  return getRfpRow(db, id)!
}

export interface UpdateRfpRowInput {
  name?: string
  customer?: string
  dueDate?: string | null
  notes?: string | null
  status?: string
  decision?: string | null
  decisionRationale?: string | null
}

const UPDATABLE_COLUMNS: Record<keyof UpdateRfpRowInput, string> = {
  name: 'name',
  customer: 'customer',
  dueDate: 'due_date',
  notes: 'notes',
  status: 'status',
  decision: 'decision',
  decisionRationale: 'decision_rationale',
}

export function updateRfpRow(db: Database.Database, id: string, input: UpdateRfpRowInput): RfpRow | undefined {
  const sets: string[] = []
  const values: unknown[] = []
  for (const key of Object.keys(input) as (keyof UpdateRfpRowInput)[]) {
    if (input[key] === undefined) continue
    sets.push(`${UPDATABLE_COLUMNS[key]} = ?`)
    values.push(input[key])
  }
  if (sets.length === 0) return getRfpRow(db, id)

  sets.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.prepare(`UPDATE rfps SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return getRfpRow(db, id)
}

export function setSourceFilePath(db: Database.Database, id: string, sourceFilePath: string): void {
  db.prepare('UPDATE rfps SET source_file_path = ? WHERE id = ?').run(sourceFilePath, id)
}

export function deleteRfpRow(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM rfps WHERE id = ?').run(id)
  return result.changes > 0
}
