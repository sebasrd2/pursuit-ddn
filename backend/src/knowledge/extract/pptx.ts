import JSZip from 'jszip'
import type { ExtractedSection } from '../chunk.js'

const TEXT_RUN_PATTERN = /<a:t>([^<]*)<\/a:t>/g

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

function decodeXmlEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITIES[entity] ?? entity)
}

function slideNumber(path: string): number {
  return Number(path.match(/slide(\d+)\.xml$/)![1])
}

export async function extractPptx(buffer: Buffer): Promise<ExtractedSection[]> {
  const zip = await JSZip.loadAsync(buffer)
  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b))

  const sections: ExtractedSection[] = []
  for (const slidePath of slidePaths) {
    const xml = await zip.files[slidePath]!.async('text')
    const runs = [...xml.matchAll(TEXT_RUN_PATTERN)].map((m) => decodeXmlEntities(m[1]!).trim()).filter(Boolean)
    if (runs.length === 0) continue

    sections.push({ heading: runs[0] ?? `Slide ${slideNumber(slidePath)}`, text: runs.join('\n') })
  }
  return sections
}
