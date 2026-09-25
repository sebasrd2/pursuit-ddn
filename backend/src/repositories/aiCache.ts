import type Database from 'better-sqlite3'

export function getCached(db: Database.Database, key: string): string | undefined {
  const row = db.prepare('SELECT response_json FROM ai_cache WHERE cache_key = ?').get(key) as
    | { response_json: string }
    | undefined
  return row?.response_json
}

export function setCached(db: Database.Database, key: string, responseJson: string): void {
  db.prepare(`
    INSERT INTO ai_cache (cache_key, response_json, created_at) VALUES (?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json, created_at = excluded.created_at
  `).run(key, responseJson, new Date().toISOString())
}
