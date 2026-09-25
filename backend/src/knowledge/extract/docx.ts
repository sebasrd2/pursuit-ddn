import mammoth from 'mammoth'
import type { ExtractedSection } from '../chunk.js'
import { splitHtmlByHeadings } from './html.js'

export async function extractDocx(buffer: Buffer): Promise<ExtractedSection[]> {
  const { value: html } = await mammoth.convertToHtml({ buffer })
  return splitHtmlByHeadings(html)
}
