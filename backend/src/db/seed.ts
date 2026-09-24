import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type Database from 'better-sqlite3'

const CONFIG_DIR = path.resolve(import.meta.dirname, '..', '..', '..', 'config')

interface BidCriterionSeed {
  key: string
  name: string
  description: string
  enabled: boolean
  importance: 'low' | 'medium' | 'high' | null
  isDisqualifier: boolean
}

interface OwnerTeamSeed {
  name: string
  isDefault: boolean
}

/** Loads config/*.json into the database, without overwriting rows a user already edited. */
export function seed(db: Database.Database): void {
  const criteria = JSON.parse(
    fs.readFileSync(path.join(CONFIG_DIR, 'bid-criteria.json'), 'utf-8'),
  ) as BidCriterionSeed[]

  const insertCriterion = db.prepare(`
    INSERT INTO bid_criteria (id, key, name, description, enabled, importance, is_disqualifier, display_order)
    VALUES (@id, @key, @name, @description, @enabled, @importance, @isDisqualifier, @displayOrder)
    ON CONFLICT(key) DO NOTHING
  `)
  criteria.forEach((c, index) => {
    insertCriterion.run({
      id: crypto.randomUUID(),
      key: c.key,
      name: c.name,
      description: c.description,
      enabled: c.enabled ? 1 : 0,
      importance: c.importance,
      isDisqualifier: c.isDisqualifier ? 1 : 0,
      displayOrder: index,
    })
  })

  const teams = JSON.parse(
    fs.readFileSync(path.join(CONFIG_DIR, 'owner-teams.json'), 'utf-8'),
  ) as OwnerTeamSeed[]

  const existingTeamCount = (
    db.prepare('SELECT COUNT(*) AS n FROM owner_teams').get() as { n: number }
  ).n
  if (existingTeamCount === 0) {
    const insertTeam = db.prepare(`
      INSERT INTO owner_teams (id, name, is_default, display_order, active)
      VALUES (?, ?, ?, ?, 1)
    `)
    teams.forEach((t, index) => {
      insertTeam.run(crypto.randomUUID(), t.name, t.isDefault ? 1 : 0, index)
    })
  }

  db.prepare('INSERT OR IGNORE INTO scoping_settings (id, threshold) VALUES (1, ?)').run('balanced')
}
