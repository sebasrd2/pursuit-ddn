import type Database from 'better-sqlite3'
import type { RfpRow } from '../repositories/rfps.js'
import type { QuestionRow } from '../repositories/questions.js'
import type { CategoryRow } from '../repositories/categories.js'
import type { OwnerTeamRow } from '../repositories/ownerTeams.js'
import type { BidCriterionRow } from '../repositories/bidCriteria.js'
import type { ScopingRunRow } from '../repositories/scopingRuns.js'
import type { KnowledgeDocumentRow } from '../repositories/knowledgeDocuments.js'
import { getQuestionCounts } from '../repositories/questions.js'
import { listCategoryRows } from '../repositories/categories.js'
import { getScopingRunRow } from '../repositories/scopingRuns.js'
import { deriveStage } from './stage.js'
import { THRESHOLD_BANDS } from './scoring.js'
import type {
  BidCriterion,
  BidDecision,
  Category,
  KnowledgeDocument,
  OwnerTeam,
  QuestionStatus,
  Rfp,
  ScopingResult,
  Threshold,
} from '../types.js'
import type { Question } from '../types.js'

export function toRfpView(db: Database.Database, row: RfpRow): Rfp {
  const questionCount = (
    db.prepare('SELECT COUNT(*) AS n FROM questions WHERE rfp_id = ?').get(row.id) as { n: number }
  ).n
  const counts = getQuestionCounts(db, row.id)
  const categoryCount = listCategoryRows(db, row.id).length
  const hasScopingResult = getScopingRunRow(db, row.id) !== undefined

  const { stage, name } = deriveStage({
    decision: row.decision as BidDecision,
    hasScopingResult,
    questionCount,
    counts,
  })

  return {
    id: row.id,
    name: row.name,
    customer: row.customer,
    dueDate: row.due_date,
    status: row.status as Rfp['status'],
    decision: row.decision as BidDecision,
    decisionRationale: row.decision_rationale,
    sourceFileName: row.source_file_name,
    notes: row.notes,
    currentStage: stage,
    currentStageName: name,
    questionCounts: counts,
    categoryCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toCategoryView(row: CategoryRow): Category {
  return { id: row.id, rfpId: row.rfp_id, name: row.name, displayOrder: row.display_order }
}

export function toQuestionView(row: QuestionRow, categoryName: string): Question {
  return {
    id: row.id,
    rfpId: row.rfp_id,
    categoryId: row.category_id,
    categoryName,
    rowNumber: row.row_number,
    questionText: row.question_text,
    answerText: row.answer_text,
    citation: row.citation,
    answerSource: row.answer_source as Question['answerSource'],
    status: row.status as QuestionStatus,
    gapNote: row.gap_note,
    ownerTeamId: row.owner_team_id,
    ownerName: row.owner_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toOwnerTeamView(row: OwnerTeamRow): OwnerTeam {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default === 1,
    displayOrder: row.display_order,
    active: row.active === 1,
  }
}

export function toBidCriterionView(row: BidCriterionRow): BidCriterion {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabled: row.enabled === 1,
    importance: row.importance as BidCriterion['importance'],
    isDisqualifier: row.is_disqualifier === 1,
  }
}

export function toKnowledgeDocumentView(row: KnowledgeDocumentRow): KnowledgeDocument {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type as KnowledgeDocument['sourceType'],
    location: row.location,
    tags: JSON.parse(row.tags_json),
    passageCount: row.passage_count,
    ingestedAt: row.ingested_at,
    error: row.error,
  }
}

export function toScopingResultView(row: ScopingRunRow): ScopingResult {
  const threshold = row.threshold as Threshold
  return {
    id: row.id,
    rfpId: row.rfp_id,
    criteria: JSON.parse(row.criteria_json),
    disqualifierTriggered: row.disqualifier_triggered === 1,
    overallScore: row.overall_score,
    threshold,
    thresholdBand: THRESHOLD_BANDS[threshold],
    recommendation: row.recommendation as ScopingResult['recommendation'],
    createdAt: row.created_at,
  }
}
