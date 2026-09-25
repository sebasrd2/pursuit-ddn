import type Database from 'better-sqlite3'
import crypto from 'node:crypto'
import type { CriterionResult, Recommendation, Threshold } from '../types.js'

export interface ScopingRunRow {
  id: string
  rfp_id: string
  criteria_json: string
  disqualifier_triggered: number
  overall_score: number | null
  threshold: string
  recommendation: string
  created_at: string
}

export function getScopingRunRow(db: Database.Database, rfpId: string): ScopingRunRow | undefined {
  return db.prepare('SELECT * FROM scoping_runs WHERE rfp_id = ?').get(rfpId) as ScopingRunRow | undefined
}

export interface SaveScopingRunInput {
  rfpId: string
  criteria: CriterionResult[]
  disqualifierTriggered: boolean
  overallScore: number | null
  threshold: Threshold
  recommendation: Recommendation
}

/** Only the latest scoping result is kept per RFP — re-running replaces it (spec §3.3.7). */
export function saveScopingRun(db: Database.Database, input: SaveScopingRunInput): ScopingRunRow {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO scoping_runs (id, rfp_id, criteria_json, disqualifier_triggered, overall_score, threshold, recommendation, created_at)
    VALUES (@id, @rfpId, @criteriaJson, @disqualifierTriggered, @overallScore, @threshold, @recommendation, @createdAt)
    ON CONFLICT(rfp_id) DO UPDATE SET
      id = @id,
      criteria_json = @criteriaJson,
      disqualifier_triggered = @disqualifierTriggered,
      overall_score = @overallScore,
      threshold = @threshold,
      recommendation = @recommendation,
      created_at = @createdAt
  `).run({
    id,
    rfpId: input.rfpId,
    criteriaJson: JSON.stringify(input.criteria),
    disqualifierTriggered: input.disqualifierTriggered ? 1 : 0,
    overallScore: input.overallScore,
    threshold: input.threshold,
    recommendation: input.recommendation,
    createdAt: now,
  })
  return getScopingRunRow(db, input.rfpId)!
}
