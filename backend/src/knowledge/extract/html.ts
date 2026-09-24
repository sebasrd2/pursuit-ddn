import { convert } from 'html-to-text'
import type { ExtractedSection } from '../chunk.js'

const HEADING_PATTERN = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi

function toPlainText(html: string): string {
  return convert(html, { wordwrap: false }).trim()
}

/** Splits an HTML document into heading-delimited sections, converting each body to plain text. */
export function splitHtmlByHeadings(html: string): ExtractedSection[] {
  const matches = [...html.matchAll(HEADING_PATTERN)]
  if (matches.length === 0) {
    const text = toPlainText(html)
    return text ? [{ heading: null, text }] : []
  }

  const sections: ExtractedSection[] = []
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!
    const heading = toPlainText(match[1]!)
    const start = match.index + match[0].length
    const end = matches[i + 1]?.index ?? html.length
    const text = toPlainText(html.slice(start, end))
    if (text) sections.push({ heading: heading || null, text })
  }
  return sections
}
