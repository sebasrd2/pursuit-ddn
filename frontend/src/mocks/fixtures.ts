import type {
  BidCriterion,
  Category,
  KnowledgeDocument,
  OwnerTeam,
  Question,
  QuestionCounts,
  QuestionStatus,
  ScopingResult,
  ScopingSettings,
} from '../api/types'
import { recommend, scoreCriteria, type DisqualifierProfile, type ScopingProfileEntry } from './scoring'

export interface RfpRecord {
  id: string
  name: string
  customer: string
  dueDate: string | null
  status: 'draft' | 'scoping' | 'no_bid' | 'in_progress' | 'in_review' | 'complete'
  decision: 'bid' | 'no_bid' | null
  decisionRationale: string | null
  sourceFileName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

let idCounter = 1
export function nextId(prefix: string): string {
  return `${prefix}-${idCounter++}`
}

export const ownerTeams: OwnerTeam[] = [
  { id: 'team-se', name: 'Sales Engineer (SE)', isDefault: true, displayOrder: 0, active: true },
  { id: 'team-legal', name: 'Legal', isDefault: false, displayOrder: 1, active: true },
  { id: 'team-security', name: 'Security & Compliance', isDefault: false, displayOrder: 2, active: true },
  { id: 'team-hr', name: 'HR / People', isDefault: false, displayOrder: 3, active: true },
  { id: 'team-ops', name: 'Operations', isDefault: false, displayOrder: 4, active: true },
  { id: 'team-finance', name: 'Finance', isDefault: false, displayOrder: 5, active: true },
  { id: 'team-pm', name: 'Product Management', isDefault: false, displayOrder: 6, active: true },
  { id: 'team-eng', name: 'Engineering', isDefault: false, displayOrder: 7, active: true },
  { id: 'team-support', name: 'Support & Services', isDefault: false, displayOrder: 8, active: true },
  { id: 'team-marketing', name: 'Marketing', isDefault: false, displayOrder: 9, active: true },
  { id: 'team-exec', name: 'Executive', isDefault: false, displayOrder: 10, active: true },
  { id: 'team-other', name: 'Other', isDefault: false, displayOrder: 11, active: true },
]

export const bidCriteria: BidCriterion[] = [
  {
    id: 'crit-product-fit',
    key: 'product_fit',
    name: 'Product fit',
    description: "Whether DDN's portfolio addresses the requirements",
    enabled: true,
    importance: 'high',
    isDisqualifier: false,
  },
  {
    id: 'crit-technical-feasibility',
    key: 'technical_feasibility',
    name: 'Technical feasibility',
    description: 'Whether the requirements are achievable with current products',
    enabled: true,
    importance: 'high',
    isDisqualifier: false,
  },
  {
    id: 'crit-requirements-coverage',
    key: 'requirements_coverage',
    name: 'Requirements coverage',
    description: 'How much of the question set can be answered from known material',
    enabled: true,
    importance: 'medium',
    isDisqualifier: false,
  },
  {
    id: 'crit-effort-vs-opportunity',
    key: 'effort_vs_opportunity',
    name: 'Effort vs. opportunity',
    description: 'The response effort relative to the opportunity',
    enabled: true,
    importance: 'medium',
    isDisqualifier: false,
  },
  {
    id: 'crit-disqualifier',
    key: 'mandatory_disqualifier',
    name: 'Mandatory disqualifier',
    description: 'Whether the RFP states a requirement DDN cannot meet at all',
    enabled: true,
    importance: null,
    isDisqualifier: true,
  },
]

export const scopingSettings: ScopingSettings = { threshold: 'balanced' }

export const rfps: RfpRecord[] = []
export const categories: Category[] = []
export const questions: Question[] = []
export const scopingResults = new Map<string, ScopingResult>()
export const scopingProfiles = new Map<
  string,
  { criteria: Record<string, ScopingProfileEntry>; disqualifier: DisqualifierProfile }
>()

export const knowledgeDocuments: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    title: 'EXAScaler Datasheet',
    sourceType: 'datasheet',
    location: 'knowledge/datasheets/exascaler.pdf',
    tags: ['hpc', 'parallel-filesystem'],
    passageCount: 24,
    ingestedAt: '2026-08-14T09:00:00Z',
    error: null,
  },
  {
    id: 'doc-2',
    title: 'Infinia Object Storage — Product Documentation',
    sourceType: 'documentation',
    location: 'knowledge/documentation/infinia.md',
    tags: ['object-storage', 's3'],
    passageCount: 61,
    ingestedAt: '2026-08-14T09:00:00Z',
    error: null,
  },
  {
    id: 'doc-3',
    title: 'DDN Security & Compliance Overview',
    sourceType: 'documentation',
    location: 'knowledge/documentation/security-overview.md',
    tags: ['security', 'compliance'],
    passageCount: 18,
    ingestedAt: '2026-08-15T11:30:00Z',
    error: null,
  },
  {
    id: 'doc-4',
    title: 'Q2 2026 Past RFP — Meridian Bank',
    sourceType: 'past-rfp',
    location: 'knowledge/past-rfps/meridian-bank-q2-2026.xlsx',
    tags: ['finance', 'past-rfp'],
    passageCount: 132,
    ingestedAt: '2026-07-02T16:00:00Z',
    error: null,
  },
  {
    id: 'doc-5',
    title: 'Backup & Disaster Recovery Webinar Transcript',
    sourceType: 'transcript',
    location: 'knowledge/transcripts/backup-dr-webinar.txt',
    tags: ['backup', 'dr'],
    passageCount: 9,
    ingestedAt: '2026-06-20T14:00:00Z',
    error: null,
  },
]

function computeCounts(rfpId: string): QuestionCounts {
  const qs = questions.filter((q) => q.rfpId === rfpId)
  const count = (status: QuestionStatus) => qs.filter((q) => q.status === status).length
  return {
    total: qs.length,
    unanswered: count('unanswered'),
    needsInput: count('needs_input'),
    aiAnswered: count('ai_answered'),
    inReview: count('in_review'),
    approved: count('approved'),
    notApplicable: count('not_applicable'),
  }
}

export function deriveStage(record: RfpRecord): { stage: number; name: string } {
  const STAGE_NAMES = ['', 'Import', 'Scoping', 'Decision', 'Auto-answer', 'Review', 'Export']

  if (record.decision === 'no_bid') {
    return { stage: 3, name: STAGE_NAMES[3] }
  }

  const qs = questions.filter((q) => q.rfpId === record.id)
  const stage1Done = qs.length > 0
  const stage2Done = scopingResults.has(record.id)
  const stage3Done = record.decision === 'bid'
  const stage4Done = stage3Done && qs.every((q) => q.status !== 'unanswered')
  const stage5Done = stage4Done && qs.every((q) => q.status !== 'ai_answered' && q.status !== 'needs_input')
  const stage6Done = record.status === 'complete'

  if (!stage1Done) return { stage: 1, name: STAGE_NAMES[1] }
  if (!stage2Done) return { stage: 2, name: STAGE_NAMES[2] }
  if (!stage3Done) return { stage: 3, name: STAGE_NAMES[3] }
  if (!stage4Done) return { stage: 4, name: STAGE_NAMES[4] }
  if (!stage5Done) return { stage: 5, name: STAGE_NAMES[5] }
  if (!stage6Done) return { stage: 6, name: STAGE_NAMES[6] }
  return { stage: 6, name: STAGE_NAMES[6] }
}

export function toRfpView(record: RfpRecord) {
  const { stage, name: stageName } = deriveStage(record)
  return {
    id: record.id,
    name: record.name,
    customer: record.customer,
    dueDate: record.dueDate,
    status: record.status,
    decision: record.decision,
    decisionRationale: record.decisionRationale,
    sourceFileName: record.sourceFileName,
    notes: record.notes,
    currentStage: stage,
    currentStageName: stageName,
    questionCounts: computeCounts(record.id),
    categoryCount: categories.filter((c) => c.rfpId === record.id).length,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export function recomputeScopingResult(rfpId: string): ScopingResult {
  const profile = scopingProfiles.get(rfpId)
  const { results, score } = scoreCriteria(bidCriteria, profile?.criteria ?? {})
  const disqualifierTriggered = profile?.disqualifier.triggered ?? false
  const disqualifierCriterion = bidCriteria.find((c) => c.isDisqualifier)!

  const fullResults = [
    {
      criterionId: disqualifierCriterion.id,
      name: disqualifierCriterion.name,
      description: disqualifierCriterion.description,
      enabled: disqualifierCriterion.enabled,
      importance: null,
      isDisqualifier: true,
      assessment: (disqualifierTriggered ? 'triggered' : 'not_triggered') as 'triggered' | 'not_triggered',
      points: null,
      evidence: profile?.disqualifier.evidence ?? null,
      reasoning: profile?.disqualifier.reasoning ?? 'No disqualifying requirement was found.',
    },
    ...results,
  ]

  const result: ScopingResult = {
    id: nextId('scope'),
    rfpId,
    criteria: fullResults,
    disqualifierTriggered,
    overallScore: score,
    threshold: scopingSettings.threshold,
    thresholdBand: {
      bid: { conservative: 80, balanced: 65, aggressive: 50 }[scopingSettings.threshold],
      conditionalLow: { conservative: 60, balanced: 45, aggressive: 35 }[scopingSettings.threshold],
      conditionalHigh: { conservative: 79, balanced: 64, aggressive: 49 }[scopingSettings.threshold],
    },
    recommendation: recommend(score, scopingSettings.threshold, disqualifierTriggered),
    createdAt: new Date().toISOString(),
  }

  scopingResults.set(rfpId, result)
  return result
}

function addRfp(
  input: Omit<RfpRecord, 'id' | 'createdAt' | 'updatedAt'>,
  categoryNames: string[],
  questionRows: Array<{ category: string; question: string; status: QuestionStatus } & Partial<Question>>,
): RfpRecord {
  const id = nextId('rfp')
  const now = new Date().toISOString()
  const record: RfpRecord = { ...input, id, createdAt: now, updatedAt: now }
  rfps.push(record)

  const categoryIdByName = new Map<string, string>()
  categoryNames.forEach((catName, index) => {
    const catId = nextId('cat')
    categoryIdByName.set(catName, catId)
    categories.push({ id: catId, rfpId: id, name: catName, displayOrder: index })
  })

  questionRows.forEach((row, index) => {
    const catId = categoryIdByName.get(row.category) ?? categoryIdByName.values().next().value!
    questions.push({
      id: nextId('q'),
      rfpId: id,
      categoryId: catId,
      categoryName: row.category,
      rowNumber: index + 1,
      questionText: row.question,
      answerText: row.answerText ?? '',
      citation: row.citation ?? null,
      answerSource: row.answerSource ?? null,
      status: row.status,
      gapNote: row.gapNote ?? null,
      ownerTeamId: row.ownerTeamId ?? 'team-se',
      ownerName: row.ownerName ?? null,
      notes: row.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
  })

  return record
}

// --- Seed data -------------------------------------------------------------

const heliosCategories = ['General', 'Security', 'Performance']
addRfp(
  {
    name: 'Object Storage Platform RFP',
    customer: 'Helios Data',
    dueDate: '2026-10-15',
    status: 'draft',
    decision: null,
    decisionRationale: null,
    sourceFileName: 'helios-data-rfp-questions.xlsx',
    notes: 'Existing customer, expanding footprint into object storage.',
  },
  heliosCategories,
  [
    { category: 'General', question: 'Describe your company and years in the storage market.', status: 'unanswered' },
    { category: 'General', question: 'What is your standard support SLA for production issues?', status: 'unanswered' },
    { category: 'Security', question: 'Do you support encryption at rest and in transit?', status: 'unanswered' },
    { category: 'Security', question: 'Is the platform FIPS 140-2 validated?', status: 'unanswered' },
    { category: 'Performance', question: 'What is the maximum sustained throughput per node?', status: 'unanswered' },
  ],
)

const nimbusCategories = ['General', 'Compliance', 'Backup & Recovery']
const nimbus = addRfp(
  {
    name: 'Backup & DR Modernization RFP',
    customer: 'Nimbus Health',
    dueDate: '2026-10-02',
    status: 'scoping',
    decision: null,
    decisionRationale: null,
    sourceFileName: 'nimbus-health-backup-dr.xlsx',
    notes: 'Healthcare customer, HIPAA requirements throughout.',
  },
  nimbusCategories,
  [
    { category: 'General', question: 'Provide an overview of your backup and disaster recovery solution.', status: 'unanswered' },
    { category: 'Compliance', question: 'Is your solution HIPAA compliant?', status: 'unanswered' },
    { category: 'Compliance', question: 'Do you provide a signed Business Associate Agreement (BAA)?', status: 'unanswered' },
    { category: 'Backup & Recovery', question: 'What is your guaranteed RPO and RTO?', status: 'unanswered' },
    { category: 'Backup & Recovery', question: 'Do you support immutable, air-gapped backup copies?', status: 'unanswered' },
    { category: 'Backup & Recovery', question: 'What is your maximum supported backup retention period?', status: 'unanswered' },
  ],
)
scopingProfiles.set(nimbus.id, {
  criteria: {
    product_fit: { assessment: 'strong', evidence: 'Infinia Object Storage — Product Documentation', reasoning: 'DDN backup and immutability features directly match the stated requirements.' },
    technical_feasibility: { assessment: 'strong', evidence: 'Backup & Disaster Recovery Webinar Transcript', reasoning: 'RPO/RTO targets are within documented product capability.' },
    requirements_coverage: { assessment: 'partial', evidence: 'DDN Security & Compliance Overview', reasoning: 'Most compliance questions are covered; BAA process is not documented in the knowledge base.' },
    effort_vs_opportunity: { assessment: 'strong', evidence: null, reasoning: 'Question set is short and well within past-RFP precedent.' },
  },
  disqualifier: { triggered: false, evidence: null, reasoning: 'No requirement was found that DDN cannot meet.' },
})
recomputeScopingResult(nimbus.id)

const solaceCategories = ['General', 'Technical', 'Commercial']
addRfp(
  {
    name: 'HPC Storage Refresh RFP',
    customer: 'Solace Financial',
    dueDate: '2026-09-30',
    status: 'in_progress',
    decision: 'bid',
    decisionRationale: 'Strong technical fit and an existing relationship with the infrastructure team.',
    sourceFileName: 'solace-financial-hpc-refresh.xlsx',
    notes: null,
  },
  solaceCategories,
  [
    { category: 'General', question: 'Summarize your proposed architecture for this workload.', status: 'unanswered' },
    { category: 'Technical', question: 'What parallel filesystem do you propose and why?', status: 'unanswered' },
    { category: 'Technical', question: 'Describe your GPU-direct storage support.', status: 'unanswered' },
    { category: 'Commercial', question: 'Provide indicative pricing for a 2PB usable configuration.', status: 'unanswered' },
  ],
)

const vertexCategories = ['General', 'Product', 'Support']
const vertex = addRfp(
  {
    name: 'Media Archive Platform RFP',
    customer: 'Vertex Media',
    dueDate: '2026-09-25',
    status: 'in_progress',
    decision: 'bid',
    decisionRationale: 'Good fit for our archive tiering story.',
    sourceFileName: 'vertex-media-archive.xlsx',
    notes: null,
  },
  vertexCategories,
  [
    {
      category: 'General',
      question: 'Describe your company and relevant media & entertainment customers.',
      status: 'approved',
      answerText: 'DDN has supported media and entertainment workloads for over 20 years, including archive and active-production storage for major studios and broadcasters.',
      citation: 'Infinia Object Storage — Product Documentation',
      answerSource: 'ai',
    },
    {
      category: 'Product',
      question: 'What storage tiers are available and how is tiering policy configured?',
      status: 'ai_answered',
      answerText: 'The platform supports hot, warm and cold tiers with policy-based automatic tiering configured per bucket or namespace.',
      citation: 'Infinia Object Storage — Product Documentation',
      answerSource: 'ai',
    },
    {
      category: 'Product',
      question: 'What is your maximum single-object size?',
      status: 'needs_input',
      gapNote: 'No documented maximum object size was found in the knowledge base or allowed DDN domains.',
      ownerTeamId: 'team-eng',
    },
    {
      category: 'Support',
      question: 'Describe your professional services offering for migration.',
      status: 'in_review',
      answerText: 'DDN Professional Services offers migration planning, execution and validation as a scoped engagement.',
      citation: 'Backup & Disaster Recovery Webinar Transcript',
      answerSource: 'human',
      ownerTeamId: 'team-support',
    },
    {
      category: 'Support',
      question: 'What are your standard support hours and escalation process?',
      status: 'needs_input',
      gapNote: 'Support hours vary by contract tier; no single documented answer applies without more information from the customer.',
      ownerTeamId: 'team-support',
    },
  ],
)
scopingProfiles.set(vertex.id, {
  criteria: {
    product_fit: { assessment: 'strong', evidence: 'Infinia Object Storage — Product Documentation', reasoning: 'Tiering and archive capabilities match the requirements closely.' },
    technical_feasibility: { assessment: 'strong', evidence: 'Infinia Object Storage — Product Documentation', reasoning: 'Requested scale is within documented product limits.' },
    requirements_coverage: { assessment: 'partial', evidence: null, reasoning: 'Several product-limit questions have no documented answer yet.' },
    effort_vs_opportunity: { assessment: 'partial', evidence: null, reasoning: 'Moderate question count relative to deal size.' },
  },
  disqualifier: { triggered: false, evidence: null, reasoning: 'No requirement was found that DDN cannot meet.' },
})
recomputeScopingResult(vertex.id)

const auroraCategories = ['General', 'Technical']
const aurora = addRfp(
  {
    name: 'Flash Array Refresh RFP',
    customer: 'Aurora Labs',
    dueDate: '2026-09-10',
    status: 'no_bid',
    decision: 'no_bid',
    decisionRationale: 'Requires a certified FedRAMP High deployment, which DDN does not currently offer.',
    sourceFileName: 'aurora-labs-flash-refresh.xlsx',
    notes: null,
  },
  auroraCategories,
  [
    { category: 'General', question: 'Describe your company history.', status: 'unanswered' },
    { category: 'Technical', question: 'Is your platform FedRAMP High authorized?', status: 'unanswered' },
  ],
)
scopingProfiles.set(aurora.id, {
  criteria: {
    product_fit: { assessment: 'partial', evidence: null, reasoning: 'General product fit is reasonable outside the compliance gap.' },
    technical_feasibility: { assessment: 'weak', evidence: null, reasoning: 'FedRAMP High is not a certification DDN currently holds.' },
    requirements_coverage: { assessment: 'not_assessed', evidence: null, reasoning: 'Not evaluated once the disqualifier triggered.' },
    effort_vs_opportunity: { assessment: 'not_assessed', evidence: null, reasoning: 'Not evaluated once the disqualifier triggered.' },
  },
  disqualifier: { triggered: true, evidence: 'DDN Security & Compliance Overview', reasoning: 'The overview does not list FedRAMP High among current authorizations, and the RFP states it as a mandatory requirement.' },
})
recomputeScopingResult(aurora.id)

const brightlineCategories = ['General', 'Technical', 'Commercial']
const brightline = addRfp(
  {
    name: 'Logistics Data Platform RFP',
    customer: 'Brightline Logistics',
    dueDate: '2026-08-20',
    status: 'complete',
    decision: 'bid',
    decisionRationale: 'Strong fit, fast turnaround.',
    sourceFileName: 'brightline-logistics-rfp.xlsx',
    notes: 'Submitted 2026-08-18.',
  },
  brightlineCategories,
  [
    { category: 'General', question: 'Describe your company and years in the storage market.', status: 'approved', answerText: 'DDN has been a leading storage vendor for data-intensive workloads for over 25 years.', citation: 'Infinia Object Storage — Product Documentation', answerSource: 'ai' },
    { category: 'Technical', question: 'What is your maximum sustained throughput per node?', status: 'approved', answerText: 'Sustained throughput scales linearly per node; see the EXAScaler datasheet for current per-node figures.', citation: 'EXAScaler Datasheet', answerSource: 'human' },
    { category: 'Commercial', question: 'Provide indicative pricing for a 500TB usable configuration.', status: 'approved', answerText: 'Indicative pricing was provided directly to the customer under NDA.', citation: 'Sales Engineer', answerSource: 'human', ownerTeamId: 'team-finance' },
  ],
)
scopingProfiles.set(brightline.id, {
  criteria: {
    product_fit: { assessment: 'strong', evidence: 'Infinia Object Storage — Product Documentation', reasoning: 'Strong match to logistics data platform requirements.' },
    technical_feasibility: { assessment: 'strong', evidence: 'EXAScaler Datasheet', reasoning: 'Throughput requirements are within documented capability.' },
    requirements_coverage: { assessment: 'strong', evidence: null, reasoning: 'All questions were answerable from existing material.' },
    effort_vs_opportunity: { assessment: 'strong', evidence: null, reasoning: 'Small question set, strong opportunity.' },
  },
  disqualifier: { triggered: false, evidence: null, reasoning: 'No requirement was found that DDN cannot meet.' },
})
recomputeScopingResult(brightline.id)
