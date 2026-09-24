import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'

/** Applies every numbered .sql file in migrations/ that hasn't run yet, in order. */
export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const dir = path.resolve(import.meta.dirname, 'migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map((r) => (r as { name: string }).name),
  )

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf-8')
    db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString(),
      )
    })()
  }
}
