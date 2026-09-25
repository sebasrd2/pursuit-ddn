import type Database from 'better-sqlite3'
import type { TextProvider } from './ai/textProvider.js'
import type { EmbedProvider } from './ai/embedProvider.js'

export interface AppDeps {
  db: Database.Database
  textProvider: TextProvider
  embedProvider: EmbedProvider
  retrievalTopK: number
  llmDelayMs: number
  knowledgePath: string
  webAllowedDomains: string[]
}
