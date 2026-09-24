import type Database from 'better-sqlite3'
import crypto from 'node:crypto'

export interface QuestionRow {
  id: string
  rfp_id: string
  category_id: string
  row_number: number
  question_text: string
  answer_text: string
  citation: string | null
  answer_source: string | null
  status: string
  gap_note: string | null
  owner_team_id: string
  owner_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface QuestionCounts {
  total: number
  unanswered: number
  needsInput: number
  aiAnswered: number
  inReview: number
  approved: number
  notApplicable: number
}

export function getQuestionCounts(db: Database.Database, rfpId: string): QuestionCounts {
  const rows = db
    .prepare('SELECT status, COUNT(*) AS n FROM questions WHERE rfp_id = ? GROUP BY status')
    .all(rfpId) as { status: string; n: number }[]

  const counts: QuestionCounts = {
    total: 0,
    unanswered: 0,
    needsInput: 0,
    aiAnswered: 0,
    inReview: 0,
    approved: 0,
    notApplicable: 0,
  }
  const byStatus: Record<string, keyof QuestionCounts> = {
    unanswered: 'unanswered',
    needs_input: 'needsInput',
    ai_answered: 'aiAnswered',
    in_review: 'inReview',
    approved: 'approved',
    not_applicable: 'notApplicable',
  }
  for (const row of rows) {
    counts.total += row.n
    const key = byStatus[row.status]
    if (key) counts[key] = row.n
  }
  return counts
}

export function listQuestionRows(db: Database.Database, rfpId: string): QuestionRow[] {
  return db
    .prepare('SELECT * FROM questions WHERE rfp_id = ? ORDER BY row_number')
    .all(rfpId) as QuestionRow[]
}

export interface QuestionFilters {
  status?: string
  ownerTeamId?: string
  categoryId?: string
  search?: string
}

export function listFilteredQuestionRows(
  db: Database.Database,
  rfpId: string,
  filters: QuestionFilters,
): QuestionRow[] {
  const clauses = ['rfp_id = ?']
  const params: unknown[] = [rfpId]

  if (filters.status) {
    clauses.push('status = ?')
    params.push(filters.status)
  }
  if (filters.ownerTeamId) {
    clauses.push('owner_team_id = ?')
    params.push(filters.ownerTeamId)
  }
  if (filters.categoryId) {
    clauses.push('category_id = ?')
    params.push(filters.categoryId)
  }
  if (filters.search) {
    clauses.push('LOWER(question_text) LIKE ?')
    params.push(`%${filters.search.toLowerCase()}%`)
  }

  return db
    .prepare(`SELECT * FROM questions WHERE ${clauses.join(' AND ')} ORDER BY row_number`)
    .all(...params) as QuestionRow[]
}

export function getQuestionRow(db: Database.Database, id: string): QuestionRow | undefined {
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow | undefined
}

export interface InsertQuestionInput {
  rfpId: string
  categoryId: string
  rowNumber: number
  questionText: string
  answerText: string
  ownerTeamId: string
}

export function insertQuestionRow(db: Database.Database, input: InsertQuestionInput): QuestionRow {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO questions (id, rfp_id, category_id, row_number, question_text, answer_text,
                            citation, answer_source, status, gap_note, owner_team_id, owner_name,
                            notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'unanswered', NULL, ?, NULL, NULL, ?, ?)
  `).run(id, input.rfpId, input.categoryId, input.rowNumber, input.questionText, input.answerText, input.ownerTeamId, now, now)
  return getQuestionRow(db, id)!
}

export interface UpdateQuestionRowInput {
  questionText?: string
  answerText?: string
  citation?: string | null
  answerSource?: string | null
  status?: string
  gapNote?: string | null
  ownerTeamId?: string
  ownerName?: string | null
  notes?: string | null
}

const UPDATABLE_COLUMNS: Record<keyof UpdateQuestionRowInput, string> = {
  questionText: 'question_text',
  answerText: 'answer_text',
  citation: 'citation',
  answerSource: 'answer_source',
  status: 'status',
  gapNote: 'gap_note',
  ownerTeamId: 'owner_team_id',
  ownerName: 'owner_name',
  notes: 'notes',
}

export function updateQuestionRow(
  db: Database.Database,
  id: string,
  input: UpdateQuestionRowInput,
): QuestionRow | undefined {
  const sets: string[] = []
  const values: unknown[] = []
  for (const key of Object.keys(input) as (keyof UpdateQuestionRowInput)[]) {
    if (input[key] === undefined) continue
    sets.push(`${UPDATABLE_COLUMNS[key]} = ?`)
    values.push(input[key])
  }
  if (sets.length === 0) return getQuestionRow(db, id)

  sets.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.prepare(`UPDATE questions SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return getQuestionRow(db, id)
}

export function deleteQuestionRow(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM questions WHERE id = ?').run(id)
  return result.changes > 0
}
