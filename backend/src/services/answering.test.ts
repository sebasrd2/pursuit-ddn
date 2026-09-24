import { beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createConnection } from '../db/connection.js'
import { StubTextProvider, type StubResponder } from '../ai/stubTextProvider.js'
import { StubEmbedProvider } from '../ai/stubEmbedProvider.js'
import { insertRfpRow } from '../repositories/rfps.js'
import { insertCategoryRow } from '../repositories/categories.js'
import { insertQuestionRow, type QuestionRow } from '../repositories/questions.js'
import { upsertKnowledgeDocument } from '../repositories/knowledgeDocuments.js'
import { insertPassage } from '../repositories/knowledgePassages.js'
import { answerQuestion } from './answering.js'

let db: Database.Database

beforeEach(() => {
  db = createConnection(':memory:')
})

function makeQuestion(text = 'What certifications does the platform have?'): QuestionRow {
  const rfp = insertRfpRow(db, {
    name: 'Test RFP',
    customer: 'Acme',
    dueDate: null,
    notes: null,
    sourceFileName: null,
    sourceFilePath: null,
  })
  const category = insertCategoryRow(db, rfp.id, 'General')
  return insertQuestionRow(db, {
    rfpId: rfp.id,
    categoryId: category.id,
    rowNumber: 2,
    questionText: text,
    answerText: '',
    ownerTeamId: 'team-se',
  })
}

async function addKnowledgePassageAsync(title: string, heading: string, text: string): Promise<void> {
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
  const [vector] = await new StubEmbedProvider().embed([text])
  insertPassage(db, { documentId: document.id, ordinal: 0, heading, text, kind: 'text', vector: vector! })
}

describe('answerQuestion (confidence rule, spec §3.4)', () => {
  it('leaves the answer empty with needs_input when the knowledge base has nothing at all', async () => {
    const question = makeQuestion()
    const result = await answerQuestion(db, new StubTextProvider(), new StubEmbedProvider(), 8, question)

    expect(result.answerText).toBe('')
    expect(result.status).toBe('needs_input')
    expect(result.gapNote).toBeTruthy()
    expect(result.citation).toBeNull()
    expect(result.answerSource).toBeNull()
  })

  it('leaves the answer empty when the model reports low confidence', async () => {
    await addKnowledgePassageAsync('Datasheet', 'Certifications', 'The platform holds ISO 27001.')
    const question = makeQuestion()

    const respond: StubResponder = () => ({ confident: false, gapNote: 'Not enough detail.' })
    const result = await answerQuestion(db, new StubTextProvider(respond), new StubEmbedProvider(), 8, question)

    expect(result.answerText).toBe('')
    expect(result.status).toBe('needs_input')
    expect(result.gapNote).toBe('Not enough detail.')
  })

  it('writes an answer with a citation when the model is confident and grounds it in a real passage', async () => {
    await addKnowledgePassageAsync('Datasheet', 'Certifications', 'The platform holds ISO 27001.')
    const question = makeQuestion()

    const respond: StubResponder = () => ({
      confident: true,
      answer: 'The platform holds ISO 27001 certification.',
      citationDocumentTitle: 'Datasheet',
      citationHeading: 'Certifications',
    })
    const result = await answerQuestion(db, new StubTextProvider(respond), new StubEmbedProvider(), 8, question)

    expect(result.answerText).toBe('The platform holds ISO 27001 certification.')
    expect(result.status).toBe('ai_answered')
    expect(result.citation).toBe('Datasheet — Certifications')
    expect(result.answerSource).toBe('ai')
  })

  it('treats a claimed citation that does not match any retrieved passage as not confident', async () => {
    await addKnowledgePassageAsync('Datasheet', 'Certifications', 'The platform holds ISO 27001.')
    const question = makeQuestion()

    // The model claims confidence but cites a document that was never actually retrieved —
    // a hallucinated citation must not slip through the confidence rule.
    const respond: StubResponder = () => ({
      confident: true,
      answer: 'The platform supports FedRAMP High.',
      citationDocumentTitle: 'A Document That Does Not Exist',
    })
    const result = await answerQuestion(db, new StubTextProvider(respond), new StubEmbedProvider(), 8, question)

    expect(result.answerText).toBe('')
    expect(result.status).toBe('needs_input')
  })
})
