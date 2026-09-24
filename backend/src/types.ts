// Mirrors frontend/src/api/types.ts exactly — this is the wire contract (spec §9).
// Keep the two in sync; nothing here should diverge from what the frontend expects.

export type RfpStatus = 'draft' | 'scoping' | 'no_bid' | 'in_progress' | 'in_review' | 'complete'

export type BidDecision = 'bid' | 'no_bid' | null

export type QuestionStatus =
  | 'unanswered'
  | 'needs_input'
  | 'ai_answered'
  | 'in_review'
  | 'approved'
  | 'not_applicable'

export type AnswerSource = 'ai' | 'human' | 'mixed' | null

export type Importance = 'low' | 'medium' | 'high'

export type Threshold = 'conservative' | 'balanced' | 'aggressive'

export type CriterionAssessment = 'strong' | 'partial' | 'weak' | 'not_assessed'

export type Recommendation = 'bid' | 'conditional' | 'no_bid'

export interface QuestionCounts {
  total: number
  unanswered: number
  needsInput: number
  aiAnswered: number
  inReview: number
  approved: number
  notApplicable: number
}

export interface Rfp {
  id: string
  name: string
  customer: string
  dueDate: string | null
  status: RfpStatus
  decision: BidDecision
  decisionRationale: string | null
  sourceFileName: string | null
  notes: string | null
  currentStage: number
  currentStageName: string
  questionCounts: QuestionCounts
  categoryCount: number
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  rfpId: string
  name: string
  displayOrder: number
}

export interface Question {
  id: string
  rfpId: string
  categoryId: string
  categoryName: string
  rowNumber: number
  questionText: string
  answerText: string
  citation: string | null
  answerSource: AnswerSource
  status: QuestionStatus
  gapNote: string | null
  ownerTeamId: string
  ownerName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface OwnerTeam {
  id: string
  name: string
  isDefault: boolean
  displayOrder: number
  active: boolean
}

export interface BidCriterion {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  importance: Importance | null
  isDisqualifier: boolean
}

export interface ScopingSettings {
  threshold: Threshold
}

export interface CriterionResult {
  criterionId: string
  name: string
  description: string
  enabled: boolean
  importance: Importance | null
  isDisqualifier: boolean
  assessment: CriterionAssessment | 'triggered' | 'not_triggered'
  points: number | null
  evidence: string | null
  reasoning: string
}

export interface ThresholdBand {
  bid: number
  conditionalLow: number
  conditionalHigh: number
}

export interface ScopingResult {
  id: string
  rfpId: string
  criteria: CriterionResult[]
  disqualifierTriggered: boolean
  overallScore: number | null
  threshold: Threshold
  thresholdBand: ThresholdBand
  recommendation: Recommendation
  createdAt: string
}

export type KnowledgeSourceType =
  | 'datasheet'
  | 'documentation'
  | 'presentation'
  | 'past-rfp'
  | 'transcript'
  | 'note'
  | 'web'

export interface KnowledgeDocument {
  id: string
  title: string
  sourceType: KnowledgeSourceType
  location: string
  tags: string[]
  passageCount: number
  ingestedAt: string | null
  error: string | null
}

export interface KnowledgePassage {
  documentId: string
  documentTitle: string
  heading: string
  text: string
  score: number
}

export interface HealthInfo {
  version: string
  llmProvider: string
  llmModel: string
  embedProvider: string
  knowledgeDocumentCount: number
  knowledgePassageCount: number
}
