import { beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createConnection } from '../db/connection.js'
import { insertRfpRow, getRfpRow, updateRfpRow } from '../repositories/rfps.js'
import { insertCategoryRow } from '../repositories/categories.js'
import { insertQuestionRow } from '../repositories/questions.js'
import { autoAdvanceStatus, maybeAdvanceToInReview } from './rfpStatus.js'

describe('autoAdvanceStatus (spec §5.1)', () => {
  it('advances forward along the bid path', () => {
    expect(autoAdvanceStatus('draft', 'scoping')).toBe('scoping')
    expect(autoAdvanceStatus('scoping', 'in_progress')).toBe('in_progress')
    expect(autoAdvanceStatus('in_progress', 'in_review')).toBe('in_review')
  })

  it('never regresses a status that already advanced past the target', () => {
    expect(autoAdvanceStatus('in_progress', 'scoping')).toBe('in_progress')
    expect(autoAdvanceStatus('complete', 'in_review')).toBe('complete')
  })

  it('no_bid always wins outright, being terminal', () => {
    expect(autoAdvanceStatus('draft', 'no_bid')).toBe('no_bid')
    expect(autoAdvanceStatus('in_progress', 'no_bid')).toBe('no_bid')
  })

  it('locks a no_bid RFP against further automatic transitions', () => {
    expect(autoAdvanceStatus('no_bid', 'in_progress')).toBe('no_bid')
    expect(autoAdvanceStatus('no_bid', 'in_review')).toBe('no_bid')
  })
})

describe('maybeAdvanceToInReview', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createConnection(':memory:')
  })

  function setUpRfpWithQuestions(statuses: string[]) {
    const rfp = insertRfpRow(db, { name: 'RFP', customer: 'Acme', dueDate: null, notes: null, sourceFileName: null, sourceFilePath: null })
    updateRfpRow(db, rfp.id, { status: 'in_progress' })
    const category = insertCategoryRow(db, rfp.id, 'General')
    statuses.forEach((status, i) => {
      const q = insertQuestionRow(db, { rfpId: rfp.id, categoryId: category.id, rowNumber: i + 1, questionText: `Q${i}`, answerText: '', ownerTeamId: 'team-se' })
      db.prepare('UPDATE questions SET status = ? WHERE id = ?').run(status, q.id)
    })
    return rfp.id
  }

  it('advances to in_review once no question is unanswered', () => {
    const rfpId = setUpRfpWithQuestions(['ai_answered', 'needs_input'])
    maybeAdvanceToInReview(db, rfpId)
    expect(getRfpRow(db, rfpId)!.status).toBe('in_review')
  })

  it('does not advance while any question is still unanswered', () => {
    const rfpId = setUpRfpWithQuestions(['ai_answered', 'unanswered'])
    maybeAdvanceToInReview(db, rfpId)
    expect(getRfpRow(db, rfpId)!.status).toBe('in_progress')
  })

  it('does nothing for an RFP with no questions at all', () => {
    const rfpId = setUpRfpWithQuestions([])
    maybeAdvanceToInReview(db, rfpId)
    expect(getRfpRow(db, rfpId)!.status).toBe('in_progress')
  })
})
