import ExcelJS from 'exceljs'
import type Database from 'better-sqlite3'
import { findOrCreateCategory } from '../repositories/categories.js'
import { insertQuestionRow } from '../repositories/questions.js'

export interface ParsedRow {
  /** The row's position in the original workbook — export writes answers back to this exact row. */
  sourceRowNumber: number
  category: string
  questionText: string
  answerText: string
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (typeof value === 'object' && 'richText' in value) {
    return value.richText.map((r) => r.text).join('')
  }
  if (typeof value === 'object' && 'text' in value) {
    return String((value as { text: unknown }).text)
  }
  return String(value).trim()
}

/** Parses the fixed 3-column structure (spec §3.1): first sheet, header row skipped, A/B/C = Category/Question/Answer. */
export async function parseXlsx(buffer: Buffer): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook()
  // exceljs's shipped .d.ts declares a bogus global `Buffer extends ArrayBuffer`, which
  // conflicts with Node's real Buffer type — a scoped `any` is the standard workaround.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const rows: ParsedRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // header row

    const category = cellText(row.getCell(1).value).trim()
    const questionText = cellText(row.getCell(2).value).trim()
    const answerText = cellText(row.getCell(3).value).trim()

    if (!questionText) return // rows with an empty Question cell are ignored

    rows.push({ sourceRowNumber: rowNumber, category: category || 'General', questionText, answerText })
  })

  return rows
}

/** Creates categories (first-appearance order) and questions from parsed rows. */
export function importQuestions(
  db: Database.Database,
  rfpId: string,
  rows: ParsedRow[],
  defaultOwnerTeamId: string,
): { questionCount: number; categoryCount: number } {
  const categoryIds = new Map<string, string>()

  for (const row of rows) {
    if (!categoryIds.has(row.category)) {
      const category = findOrCreateCategory(db, rfpId, row.category)
      categoryIds.set(row.category, category.id)
    }
    insertQuestionRow(db, {
      rfpId,
      categoryId: categoryIds.get(row.category)!,
      rowNumber: row.sourceRowNumber,
      questionText: row.questionText,
      answerText: row.answerText,
      ownerTeamId: defaultOwnerTeamId,
    })
  }

  return { questionCount: rows.length, categoryCount: categoryIds.size }
}
