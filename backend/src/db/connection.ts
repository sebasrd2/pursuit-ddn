import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env.js'
import { migrate } from './migrate.js'
import { seed } from './seed.js'

export function createConnection(databasePath: string): Database.Database {
  const instance = new Database(databasePath)
  if (databasePath !== ':memory:') instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  migrate(instance)
  seed(instance)
  return instance
}

function resolveDatabasePath(): string {
  if (env.databaseUrl) return env.databaseUrl
  fs.mkdirSync(env.fileStorePath, { recursive: true })
  return path.join(env.fileStorePath, 'pursuit.db')
}

// Lazy: importing this module (e.g. for `createConnection` in tests) must not, by itself,
// open the real on-disk database — only the first call to `getDb()` does that.
let singleton: Database.Database | undefined
export function getDb(): Database.Database {
  singleton ??= createConnection(resolveDatabasePath())
  return singleton
}
