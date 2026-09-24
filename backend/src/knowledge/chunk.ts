export interface ExtractedSection {
  heading: string | null
  text: string
}

export interface Passage {
  ordinal: number
  heading: string | null
  text: string
  kind: 'text' | 'qa_pair'
}

const MAX_PASSAGE_CHARS = 1200

/** Splits one section's text into passages of roughly MAX_PASSAGE_CHARS, on paragraph breaks. */
function chunkSection(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ''
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > MAX_PASSAGE_CHARS && current) {
      chunks.push(current)
      current = paragraph
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/**
 * Detects "Q: ... A: ..." pairs across a document's full text (past RFP responses), indexing
 * each pair as one passage per spec §6.2. Returns null if no such pairs are found, so the
 * caller can fall back to generic chunking.
 */
function extractQaPairs(sections: ExtractedSection[]): Passage[] | null {
  const fullText = sections.map((s) => s.text).join('\n\n')
  const pattern = /Q(?:uestion)?[:.]\s*(.+?)\s*A(?:nswer)?[:.]\s*([\s\S]+?)(?=\n\s*Q(?:uestion)?[:.]|$)/gi

  const pairs: Passage[] = []
  let match: RegExpExecArray | null
  let ordinal = 0
  while ((match = pattern.exec(fullText)) !== null) {
    const question = match[1]!.trim()
    const answer = match[2]!.trim()
    if (!question || !answer) continue
    pairs.push({ ordinal: ordinal++, heading: question, text: `Q: ${question}\nA: ${answer}`, kind: 'qa_pair' })
  }

  return pairs.length > 0 ? pairs : null
}

export function buildPassages(sections: ExtractedSection[], options: { detectQaPairs: boolean }): Passage[] {
  if (options.detectQaPairs) {
    const qaPairs = extractQaPairs(sections)
    if (qaPairs) return qaPairs
  }

  const passages: Passage[] = []
  let ordinal = 0
  for (const section of sections) {
    for (const chunkText of chunkSection(section.text)) {
      passages.push({ ordinal: ordinal++, heading: section.heading, text: chunkText, kind: 'text' })
    }
  }
  return passages
}
