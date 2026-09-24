import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { parseXlsx } from './import.js'

async function buildWorkbook(rows: (string | undefined)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Questions')
  sheet.addRow(['Category', 'Question', 'Answer']) // header, always skipped
  for (const row of rows) sheet.addRow(row)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

describe('parseXlsx', () => {
  it('parses the fixed three-column structure, skipping the header row', async () => {
    const buffer = await buildWorkbook([['Technical', 'What filesystem do you use?', '']])
    const rows = await parseXlsx(buffer)
    expect(rows).toEqual([
      { sourceRowNumber: 2, category: 'Technical', questionText: 'What filesystem do you use?', answerText: '' },
    ])
  })

  it('ignores rows with an empty Question cell', async () => {
    const buffer = await buildWorkbook([
      ['Technical', 'Real question', ''],
      ['Technical', '', ''],
      ['Technical', undefined, ''],
    ])
    const rows = await parseXlsx(buffer)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.questionText).toBe('Real question')
  })

  it('falls back to General for an empty Category cell', async () => {
    const buffer = await buildWorkbook([[undefined, 'A question', '']])
    const rows = await parseXlsx(buffer)
    expect(rows[0]!.category).toBe('General')
  })

  it('puts every question in General when no row has a category', async () => {
    const buffer = await buildWorkbook([
      [undefined, 'Question one', ''],
      [undefined, 'Question two', ''],
    ])
    const rows = await parseXlsx(buffer)
    expect(rows.every((r) => r.category === 'General')).toBe(true)
  })

  it('imports existing text in column C as the answer', async () => {
    const buffer = await buildWorkbook([['General', 'A question', 'An existing answer']])
    const rows = await parseXlsx(buffer)
    expect(rows[0]!.answerText).toBe('An existing answer')
  })

  it('preserves the original row number for each question, for export round-tripping', async () => {
    const buffer = await buildWorkbook([
      ['General', 'First', ''],
      [undefined, undefined, ''], // ignored — no question text
      ['General', 'Second', ''],
    ])
    const rows = await parseXlsx(buffer)
    expect(rows.map((r) => r.sourceRowNumber)).toEqual([2, 4])
  })
})
