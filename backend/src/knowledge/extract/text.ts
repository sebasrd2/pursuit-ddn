import type { ExtractedSection } from '../chunk.js'

/** Splits Markdown on ATX headings (`#` … `######`); a plain .txt file has no headings at all. */
export function extractMarkdown(content: string): ExtractedSection[] {
  const lines = content.split('\n')
  const sections: ExtractedSection[] = []
  let heading: string | null = null
  let buffer: string[] = []

  function flush() {
    const text = buffer.join('\n').trim()
    if (text) sections.push({ heading, text })
    buffer = []
  }

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.*)$/)
    if (match) {
      flush()
      heading = match[2]!.trim()
    } else {
      buffer.push(line)
    }
  }
  flush()

  return sections
}

export function extractPlainText(content: string): ExtractedSection[] {
  const text = content.trim()
  return text ? [{ heading: null, text }] : []
}
