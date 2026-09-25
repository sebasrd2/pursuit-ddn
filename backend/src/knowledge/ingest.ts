import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { parse as parseYaml } from 'yaml'
import type Database from 'better-sqlite3'
import type { EmbedProvider } from '../ai/embedProvider.js'
import {
  getKnowledgeDocumentByLocation,
  upsertKnowledgeDocument,
  type KnowledgeDocumentRow,
} from '../repositories/knowledgeDocuments.js'
import { deletePassagesForDocument, insertPassage } from '../repositories/knowledgePassages.js'
import { buildPassages, type ExtractedSection } from './chunk.js'
import { extractPdf } from './extract/pdf.js'
import { extractDocx } from './extract/docx.js'
import { extractPptx } from './extract/pptx.js'
import { extractMarkdown, extractPlainText } from './extract/text.js'
import { extractWebPage } from './extract/web.js'

const FOLDER_SOURCE_TYPES: Record<string, string> = {
  datasheets: 'datasheet',
  documentation: 'documentation',
  presentations: 'presentation',
  'past-rfps': 'past-rfp',
  transcripts: 'transcript',
  notes: 'note',
}

async function extractSections(filePath: string, buffer: Buffer): Promise<ExtractedSection[]> {
  switch (path.extname(filePath).toLowerCase()) {
    case '.pdf':
      return extractPdf(buffer)
    case '.docx':
      return extractDocx(buffer)
    case '.pptx':
      return extractPptx(buffer)
    case '.md':
      return extractMarkdown(buffer.toString('utf-8'))
    case '.txt':
      return extractPlainText(buffer.toString('utf-8'))
    default:
      throw new Error(`Unsupported file type: ${filePath}`)
  }
}

async function embedAndStorePassages(
  db: Database.Database,
  embedProvider: EmbedProvider,
  documentId: string,
  sections: ExtractedSection[],
  detectQaPairs: boolean,
): Promise<number> {
  const passages = buildPassages(sections, { detectQaPairs })
  deletePassagesForDocument(db, documentId)
  if (passages.length === 0) return 0

  const vectors = await embedProvider.embed(passages.map((p) => p.text))
  passages.forEach((passage, index) => {
    insertPassage(db, {
      documentId,
      ordinal: passage.ordinal,
      heading: passage.heading,
      text: passage.text,
      kind: passage.kind,
      vector: vectors[index]!,
    })
  })
  return passages.length
}

async function ingestFile(
  db: Database.Database,
  embedProvider: EmbedProvider,
  filePath: string,
  sourceType: string,
): Promise<KnowledgeDocumentRow> {
  const title = path.basename(filePath, path.extname(filePath))
  const buffer = fs.readFileSync(filePath)
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex')

  const existing = getKnowledgeDocumentByLocation(db, filePath)
  if (existing && existing.content_hash === contentHash && !existing.error) {
    return existing // unchanged since last ingest — skip (spec §6.2: incremental)
  }

  try {
    const sections = await extractSections(filePath, buffer)
    const document = upsertKnowledgeDocument(db, {
      title,
      sourceType,
      location: filePath,
      contentHash,
      tags: [],
      passageCount: 0,
      ingestedAt: new Date().toISOString(),
      error: null,
    })
    const passageCount = await embedAndStorePassages(
      db,
      embedProvider,
      document.id,
      sections,
      sourceType === 'past-rfp',
    )
    return upsertKnowledgeDocument(db, {
      title,
      sourceType,
      location: filePath,
      contentHash,
      tags: [],
      passageCount,
      ingestedAt: new Date().toISOString(),
      error: null,
    })
  } catch (error) {
    return upsertKnowledgeDocument(db, {
      title,
      sourceType,
      location: filePath,
      contentHash,
      tags: [],
      passageCount: 0,
      ingestedAt: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function ingestWebSource(
  db: Database.Database,
  embedProvider: EmbedProvider,
  url: string,
  allowedDomains: string[],
  explicitTitle?: string,
): Promise<KnowledgeDocumentRow> {
  try {
    const { title: fetchedTitle, sections } = await extractWebPage(url, allowedDomains)
    // sources.yaml's title, when given, overrides the page's own <title> tag — useful when
    // that tag is missing, generic ("Home"), or otherwise not a good document label.
    const title = explicitTitle || fetchedTitle
    const contentHash = crypto.createHash('sha256').update(sections.map((s) => s.text).join('\n')).digest('hex')

    const existing = getKnowledgeDocumentByLocation(db, url)
    if (existing && existing.content_hash === contentHash && !existing.error) {
      return existing
    }

    const document = upsertKnowledgeDocument(db, {
      title,
      sourceType: 'web',
      location: url,
      contentHash,
      tags: [],
      passageCount: 0,
      ingestedAt: new Date().toISOString(),
      error: null,
    })
    const passageCount = await embedAndStorePassages(db, embedProvider, document.id, sections, false)
    return upsertKnowledgeDocument(db, {
      title,
      sourceType: 'web',
      location: url,
      contentHash,
      tags: [],
      passageCount,
      ingestedAt: new Date().toISOString(),
      error: null,
    })
  } catch (error) {
    return upsertKnowledgeDocument(db, {
      title: explicitTitle || url,
      sourceType: 'web',
      location: url,
      contentHash: null,
      tags: [],
      passageCount: 0,
      ingestedAt: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

interface SourcesYaml {
  sources?: { url: string; title?: string }[]
}

/** Walks knowledge/ and sources.yaml, ingesting everything found (spec §6.2). */
export async function ingestAll(
  db: Database.Database,
  embedProvider: EmbedProvider,
  knowledgePath: string,
  webAllowedDomains: string[],
): Promise<KnowledgeDocumentRow[]> {
  const results: KnowledgeDocumentRow[] = []

  for (const [folder, sourceType] of Object.entries(FOLDER_SOURCE_TYPES)) {
    const dir = path.join(knowledgePath, folder)
    if (!fs.existsSync(dir)) continue

    for (const entry of fs.readdirSync(dir)) {
      const filePath = path.join(dir, entry)
      if (!fs.statSync(filePath).isFile()) continue
      if (!['.pdf', '.docx', '.pptx', '.md', '.txt'].includes(path.extname(entry).toLowerCase())) continue
      results.push(await ingestFile(db, embedProvider, filePath, sourceType))
    }
  }

  const sourcesPath = path.join(knowledgePath, 'sources.yaml')
  if (fs.existsSync(sourcesPath)) {
    const parsed = parseYaml(fs.readFileSync(sourcesPath, 'utf-8')) as SourcesYaml | null
    for (const source of parsed?.sources ?? []) {
      results.push(await ingestWebSource(db, embedProvider, source.url, webAllowedDomains, source.title))
    }
  }

  return results
}
