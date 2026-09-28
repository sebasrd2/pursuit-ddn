import { beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createConnection } from '../db/connection.js'
import { StubEmbedProvider } from '../ai/stubEmbedProvider.js'
import { upsertKnowledgeDocument } from '../repositories/knowledgeDocuments.js'
import { insertPassage } from '../repositories/knowledgePassages.js'
import { retrieveForQuestions } from './retrieve.js'

const embed = new StubEmbedProvider()
let db: Database.Database

beforeEach(async () => {
  db = createConnection(':memory:')
  await addPassage('commercial-terms', 'Premium support tiers offer a four hour response time for critical issues.')
  await addPassage('exascaler', 'EXAScaler supports NVIDIA GPUDirect Storage for GPU training workloads.')
  await addPassage('marketing', 'Leading enterprises around the world trust our data platforms.')
})

async function addPassage(title: string, text: string): Promise<void> {
  const document = upsertKnowledgeDocument(db, {
    title,
    sourceType: 'documentation',
    location: `/fake/${title}`,
    contentHash: 'hash',
    tags: [],
    passageCount: 1,
    ingestedAt: new Date().toISOString(),
    error: null,
  })
  const [vector] = await embed.embed([text])
  insertPassage(db, { documentId: document.id, ordinal: 0, heading: title, text, kind: 'text', vector: vector! })
}

describe('retrieveForQuestions', () => {
  it('returns the best passage for each question', async () => {
    const passages = await retrieveForQuestions(
      db,
      embed,
      ['What support tiers and response time do you offer?', 'Do you support NVIDIA GPUDirect Storage?'],
      1,
      10,
    )
    expect(passages.map((p) => p.documentTitle).sort()).toEqual(['commercial-terms', 'exascaler'])
  })

  it('includes a passage once even when several questions match it', async () => {
    const passages = await retrieveForQuestions(
      db,
      embed,
      ['Do you support GPUDirect Storage?', 'Is NVIDIA GPUDirect Storage available for GPU training?'],
      1,
      10,
    )
    expect(passages.map((p) => p.documentTitle)).toEqual(['exascaler'])
  })

  it('caps the total number of passages', async () => {
    const passages = await retrieveForQuestions(db, embed, ['support tiers', 'GPUDirect Storage'], 2, 1)
    expect(passages).toHaveLength(1)
  })
})
