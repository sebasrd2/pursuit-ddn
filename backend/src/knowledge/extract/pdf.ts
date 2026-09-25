import { extractText, getDocumentProxy } from 'unpdf'
import type { ExtractedSection } from '../chunk.js'

export async function extractPdf(buffer: Buffer): Promise<ExtractedSection[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: false })
  const pages = Array.isArray(text) ? text : [text]

  return pages
    .map((pageText, index) => ({ heading: `Page ${index + 1}`, text: pageText.trim() }))
    .filter((section) => section.text.length > 0)
}
