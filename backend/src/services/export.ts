import ExcelJS from 'exceljs'
import type Database from 'better-sqlite3'
import { listQuestionRows } from '../repositories/questions.js'
import { getOwnerTeamRow } from '../repositories/ownerTeams.js'

export interface ExportOptions {
  onlyApproved: boolean
  includeExtraColumns: boolean
}

/**
 * Writes answers into column C of the original uploaded workbook, preserving row order and
 * categories exactly (spec §3.6) — the sheet's other rows and columns are untouched.
 */
export async function buildExportWorkbook(
  db: Database.Database,
  rfpId: string,
  sourceFilePath: string,
  options: ExportOptions,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(sourceFilePath)
  const sheet = workbook.worksheets[0]!

  if (options.includeExtraColumns) {
    sheet.getRow(1).getCell(4).value = 'Owner'
    sheet.getRow(1).getCell(5).value = 'Status'
    sheet.getRow(1).getCell(6).value = 'Citation'
  }

  for (const question of listQuestionRows(db, rfpId)) {
    const row = sheet.getRow(question.row_number)
    const include = !options.onlyApproved || question.status === 'approved'
    row.getCell(3).value = include && question.answer_text ? question.answer_text : null

    if (options.includeExtraColumns) {
      const owner = getOwnerTeamRow(db, question.owner_team_id)
      row.getCell(4).value = owner?.name ?? ''
      row.getCell(5).value = question.status
      row.getCell(6).value = question.citation ?? ''
    }
    row.commit()
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
