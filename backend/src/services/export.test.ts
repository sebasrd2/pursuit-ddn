import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createConnection } from '../db/connection.js'
import { insertRfpRow } from '../repositories/rfps.js'
import { insertCategoryRow } from '../repositories/categories.js'
import { insertQuestionRow, updateQuestionRow } from '../repositories/questions.js'
import { buildExportWorkbook } from './export.js'

let db: Database.Database
let tmpDir: string

beforeEach(() => {
  db = createConnection(':memory:')
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pursuit-export-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

async function buildSourceWorkbook(): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Questions')
  sheet.addRow(['Category', 'Question', 'Answer'])
  sheet.addRow(['Technical', 'What filesystem do you use?', ''])
  sheet.addRow(['Commercial', 'What is the price?', ''])
  const filePath = path.join(tmpDir, 'source.xlsx')
  await workbook.xlsx.writeFile(filePath)
  return filePath
}

async function readCell(buffer: Buffer, row: number, col: number): Promise<ExcelJS.CellValue> {
  const workbook = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs's Buffer type bug, see import.ts
  await workbook.xlsx.load(buffer as any)
  return workbook.worksheets[0]!.getRow(row).getCell(col).value
}

describe('buildExportWorkbook (spec §3.6)', () => {
  it('writes answers into column C at the original row, preserving row order', async () => {
    const sourcePath = await buildSourceWorkbook()
    const rfp = insertRfpRow(db, { name: 'RFP', customer: 'Acme', dueDate: null, notes: null, sourceFileName: null, sourceFilePath: sourcePath })
    const category = insertCategoryRow(db, rfp.id, 'Technical')
    const q1 = insertQuestionRow(db, { rfpId: rfp.id, categoryId: category.id, rowNumber: 2, questionText: 'What filesystem do you use?', answerText: '', ownerTeamId: 'team-se' })
    const q2 = insertQuestionRow(db, { rfpId: rfp.id, categoryId: category.id, rowNumber: 3, questionText: 'What is the price?', answerText: '', ownerTeamId: 'team-se' })
    updateQuestionRow(db, q1.id, { answerText: 'GPFS', status: 'approved' })
    updateQuestionRow(db, q2.id, { answerText: '$100k', status: 'approved' })

    const buffer = await buildExportWorkbook(db, rfp.id, sourcePath, { onlyApproved: false, includeExtraColumns: false })

    expect(await readCell(buffer, 2, 3)).toBe('GPFS')
    expect(await readCell(buffer, 3, 3)).toBe('$100k')
    // Original columns A/B are untouched.
    expect(await readCell(buffer, 2, 1)).toBe('Technical')
    expect(await readCell(buffer, 2, 2)).toBe('What filesystem do you use?')
  })

  it('blanks column C for non-approved questions when onlyApproved is set', async () => {
    const sourcePath = await buildSourceWorkbook()
    const rfp = insertRfpRow(db, { name: 'RFP', customer: 'Acme', dueDate: null, notes: null, sourceFileName: null, sourceFilePath: sourcePath })
    const category = insertCategoryRow(db, rfp.id, 'Technical')
    const q1 = insertQuestionRow(db, { rfpId: rfp.id, categoryId: category.id, rowNumber: 2, questionText: 'What filesystem do you use?', answerText: '', ownerTeamId: 'team-se' })
    updateQuestionRow(db, q1.id, { answerText: 'GPFS', status: 'ai_answered' }) // not approved

    const buffer = await buildExportWorkbook(db, rfp.id, sourcePath, { onlyApproved: true, includeExtraColumns: false })

    expect(await readCell(buffer, 2, 3)).toBeNull()
  })

  it('appends Owner, Status and Citation as D/E/F when requested', async () => {
    const sourcePath = await buildSourceWorkbook()
    const rfp = insertRfpRow(db, { name: 'RFP', customer: 'Acme', dueDate: null, notes: null, sourceFileName: null, sourceFilePath: sourcePath })
    const category = insertCategoryRow(db, rfp.id, 'Technical')
    const q1 = insertQuestionRow(db, { rfpId: rfp.id, categoryId: category.id, rowNumber: 2, questionText: 'What filesystem do you use?', answerText: '', ownerTeamId: 'team-se' })
    updateQuestionRow(db, q1.id, { answerText: 'GPFS', status: 'approved', citation: 'Datasheet' })

    const buffer = await buildExportWorkbook(db, rfp.id, sourcePath, { onlyApproved: false, includeExtraColumns: true })

    expect(await readCell(buffer, 1, 4)).toBe('Owner')
    expect(await readCell(buffer, 1, 5)).toBe('Status')
    expect(await readCell(buffer, 1, 6)).toBe('Citation')
    expect(await readCell(buffer, 2, 5)).toBe('approved')
    expect(await readCell(buffer, 2, 6)).toBe('Datasheet')
  })
})
