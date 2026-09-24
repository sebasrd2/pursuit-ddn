import type Database from 'better-sqlite3'

export function getThreshold(db: Database.Database): string {
  const row = db.prepare('SELECT threshold FROM scoping_settings WHERE id = 1').get() as { threshold: string }
  return row.threshold
}

export function updateThreshold(db: Database.Database, threshold: string): void {
  db.prepare('UPDATE scoping_settings SET threshold = ? WHERE id = 1').run(threshold)
}
