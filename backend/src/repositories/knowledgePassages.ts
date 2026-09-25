import type Database from 'better-sqlite3'
import crypto from 'node:crypto'

export interface KnowledgePassageRow {
  id: string
  document_id: string
  ordinal: number
  heading: string | null
  text: string
  kind: string
  vector: Buffer | null
}

export function deletePassagesForDocument(db: Database.Database, documentId: string): void {
  db.prepare('DELETE FROM knowledge_passages WHERE document_id = ?').run(documentId)
}

export interface InsertPassageInput {
  documentId: string
  ordinal: number
  heading: string | null
  text: string
  kind: string
  vector: Float32Array
}

export function insertPassage(db: Database.Database, input: InsertPassageInput): void {
  db.prepare(`
    INSERT INTO knowledge_passages (id, document_id, ordinal, heading, text, kind, vector)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    input.documentId,
    input.ordinal,
    input.heading,
    input.text,
    input.kind,
    Buffer.from(input.vector.buffer, input.vector.byteOffset, input.vector.byteLength),
  )
}

export interface PassageWithDocument {
  id: string
  document_id: string
  document_title: string
  heading: string | null
  text: string
  vector: Buffer | null
}

/** All passages with embeddings, joined with their document title, for brute-force retrieval. */
export function listAllPassagesWithDocuments(db: Database.Database): PassageWithDocument[] {
  return db
    .prepare(`
      SELECT p.id, p.document_id, d.title AS document_title, p.heading, p.text, p.vector
      FROM knowledge_passages p
      JOIN knowledge_documents d ON d.id = p.document_id
      WHERE p.vector IS NOT NULL
    `)
    .all() as PassageWithDocument[]
}

export function countKnowledgePassages(db: Database.Database): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM knowledge_passages').get() as { n: number }).n
}
