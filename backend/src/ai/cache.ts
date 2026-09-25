import type Database from 'better-sqlite3'
import crypto from 'node:crypto'
import { getCached, setCached } from '../repositories/aiCache.js'

function hashKey(parts: unknown[]): string {
  return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}

/**
 * Caches a generation call by the exact content that would produce it (model + prompts), so
 * re-running generation against unchanged input doesn't repeat identical calls (spec §7).
 */
export async function cachedGenerate(
  db: Database.Database,
  keyParts: unknown[],
  compute: () => Promise<unknown>,
): Promise<unknown> {
  const key = hashKey(keyParts)
  const cached = getCached(db, key)
  if (cached !== undefined) return JSON.parse(cached)

  const result = await compute()
  setCached(db, key, JSON.stringify(result))
  return result
}
