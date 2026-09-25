import { env } from '../config/env.js'
import { getDb } from '../db/connection.js'
import { createEmbedProvider } from '../ai/index.js'
import { ingestAll } from './ingest.js'

const embedProvider = createEmbedProvider()
const results = await ingestAll(getDb(), embedProvider, env.knowledgePath, env.webAllowedDomains)

for (const doc of results) {
  const status = doc.error ? `ERROR: ${doc.error}` : `${doc.passage_count} passages`
  console.log(`${doc.title} (${doc.source_type}) — ${status}`)
}
console.log(`\nIngested ${results.length} document(s).`)
