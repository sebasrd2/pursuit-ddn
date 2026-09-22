import ExcelJS from 'exceljs'
import type { Question } from '../api/types'
import { ownerTeams } from './fixtures'

export async function buildExportWorkbook(
  questions: Question[],
  options: { onlyApproved: boolean; includeExtraColumns: boolean },
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('RFP')

  const header = ['Category', 'Question', 'Answer']
  if (options.includeExtraColumns) header.push('Owner', 'Status', 'Citation')
  sheet.addRow(header)

  const rows = [...questions].sort((a, b) => a.rowNumber - b.rowNumber)
  for (const question of rows) {
    if (options.onlyApproved && question.status !== 'approved') continue

    const row = [question.categoryName, question.questionText, question.answerText || '']
    if (options.includeExtraColumns) {
      const owner = ownerTeams.find((t) => t.id === question.ownerTeamId)
      row.push(owner?.name ?? '', question.status, question.citation ?? '')
    }
    sheet.addRow(row)
  }

  sheet.columns.forEach((column) => {
    column.width = 40
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
