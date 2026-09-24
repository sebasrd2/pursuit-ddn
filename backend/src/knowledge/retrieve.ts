import type Database from 'better-sqlite3'
import type { EmbedProvider } from '../ai/embedProvider.js'
import { listAllPassagesWithDocuments } from '../repositories/knowledgePassages.js'
import type { KnowledgePassage } from '../types.js'

function bufferToFloat32(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT)
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Semantic retrieval over every stored passage (spec §6.3). At this scale — a company's
 * knowledge base, not the whole internet — a brute-force scan is fast enough that no
 * dedicated vector index is needed.
 */
export async function retrieve(
  db: Database.Database,
  embedProvider: EmbedProvider,
  query: string,
  topK: number,
): Promise<KnowledgePassage[]> {
  const passages = listAllPassagesWithDocuments(db)
  if (passages.length === 0) return []

  const [queryVector] = await embedProvider.embed([query])

  const scored = passages.map((passage) => ({
    passage,
    score: cosineSimilarity(queryVector!, bufferToFloat32(passage.vector!)),
  }))
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map(({ passage, score }) => ({
    documentId: passage.document_id,
    documentTitle: passage.document_title,
    heading: passage.heading ?? '',
    text: passage.text,
    score,
  }))
}
