import type Database from 'better-sqlite3'
import crypto from 'node:crypto'

export interface KnowledgeDocumentRow {
  id: string
  title: string
  source_type: string
  location: string
  content_hash: string | null
  tags_json: string
  passage_count: number
  ingested_at: string | null
  error: string | null
}

export function listKnowledgeDocumentRows(db: Database.Database): KnowledgeDocumentRow[] {
  return db.prepare('SELECT * FROM knowledge_documents ORDER BY title').all() as KnowledgeDocumentRow[]
}

export function getKnowledgeDocumentByLocation(
  db: Database.Database,
  location: string,
): KnowledgeDocumentRow | undefined {
  return db
    .prepare('SELECT * FROM knowledge_documents WHERE location = ?')
    .get(location) as KnowledgeDocumentRow | undefined
}

export function getKnowledgeDocumentRow(db: Database.Database, id: string): KnowledgeDocumentRow | undefined {
  return db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(id) as KnowledgeDocumentRow | undefined
}

export interface UpsertKnowledgeDocumentInput {
  title: string
  sourceType: string
  location: string
  contentHash: string | null
  tags: string[]
  passageCount: number
  ingestedAt: string | null
  error: string | null
}

export function upsertKnowledgeDocument(db: Database.Database, input: UpsertKnowledgeDocumentInput): KnowledgeDocumentRow {
  const existing = getKnowledgeDocumentByLocation(db, input.location)
  const id = existing?.id ?? crypto.randomUUID()
  db.prepare(`
    INSERT INTO knowledge_documents (id, title, source_type, location, content_hash, tags_json, passage_count, ingested_at, error)
    VALUES (@id, @title, @sourceType, @location, @contentHash, @tagsJson, @passageCount, @ingestedAt, @error)
    ON CONFLICT(location) DO UPDATE SET
      title = @title, source_type = @sourceType, content_hash = @contentHash,
      tags_json = @tagsJson, passage_count = @passageCount, ingested_at = @ingestedAt, error = @error
  `).run({
    id,
    title: input.title,
    sourceType: input.sourceType,
    location: input.location,
    contentHash: input.contentHash,
    tagsJson: JSON.stringify(input.tags),
    passageCount: input.passageCount,
    ingestedAt: input.ingestedAt,
    error: input.error,
  })
  return getKnowledgeDocumentRow(db, id)!
}

export function deleteKnowledgeDocumentRow(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM knowledge_documents WHERE id = ?').run(id)
  return result.changes > 0
}

export function countKnowledgeDocuments(db: Database.Database): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM knowledge_documents').get() as { n: number }).n
}
