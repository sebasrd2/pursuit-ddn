import { http, HttpResponse } from 'msw'
import type {
  CreateOwnerTeamInput,
  UpdateBidCriterionInput,
  UpdateOwnerTeamInput,
} from '../api/config'
import type { BulkUpdateInput, CreateQuestionInput, UpdateQuestionInput } from '../api/questions'
import type { UpdateRfpInput } from '../api/rfps'
import type { KnowledgePassage, Question, QuestionStatus, Threshold } from '../api/types'
import { generateAnswer } from './answering'
import {
  bidCriteria,
  categories,
  knowledgeDocuments,
  nextId,
  ownerTeams,
  questions,
  recomputeScopingResult,
  rfps,
  scopingResults,
  scopingSettings,
  toRfpView,
  type RfpRecord,
} from './fixtures'
import { buildExportWorkbook } from './export'

function findRfp(id: string): RfpRecord | undefined {
  return rfps.find((r) => r.id === id)
}

function groupQuestions(
  rfpId: string,
  filters: { status?: string; ownerTeamId?: string; categoryId?: string; search?: string },
) {
  let list = questions.filter((q) => q.rfpId === rfpId)

  if (filters.status) list = list.filter((q) => q.status === filters.status)
  if (filters.ownerTeamId) list = list.filter((q) => q.ownerTeamId === filters.ownerTeamId)
  if (filters.categoryId) list = list.filter((q) => q.categoryId === filters.categoryId)
  if (filters.search) {
    const term = filters.search.toLowerCase()
    list = list.filter((q) => q.questionText.toLowerCase().includes(term))
  }

  const cats = categories.filter((c) => c.rfpId === rfpId).sort((a, b) => a.displayOrder - b.displayOrder)

  return cats.map((cat) => {
    const catQuestions = list
      .filter((q) => q.categoryId === cat.id)
      .sort((a, b) => a.rowNumber - b.rowNumber)
    const completed = catQuestions.filter(
      (q) => q.status === 'approved' || q.status === 'not_applicable',
    ).length
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      displayOrder: cat.displayOrder,
      questions: catQuestions,
      completed,
      total: catQuestions.length,
    }
  })
}

function maybeAdvanceToInReview(rfp: RfpRecord) {
  const qs = questions.filter((q) => q.rfpId === rfp.id)
  const allAttempted = qs.length > 0 && qs.every((q) => q.status !== 'unanswered')
  if (allAttempted && rfp.status === 'in_progress') {
    rfp.status = 'in_review'
  }
}

export const handlers = [
  // --- RFPs ------------------------------------------------------------
  http.get('/api/rfps', () => {
    return HttpResponse.json(rfps.map(toRfpView))
  }),

  http.post('/api/rfps', async ({ request }) => {
    const form = await request.formData()
    const name = String(form.get('name') ?? '')
    const customer = String(form.get('customer') ?? '')
    const dueDate = form.get('dueDate') ? String(form.get('dueDate')) : null
    const notes = form.get('notes') ? String(form.get('notes')) : null
    const file = form.get('file') as File | null

    const now = new Date().toISOString()
    const id = nextId('rfp')
    const record: RfpRecord = {
      id,
      name,
      customer,
      dueDate,
      status: 'draft',
      decision: null,
      decisionRationale: null,
      sourceFileName: file?.name ?? null,
      notes,
      createdAt: now,
      updatedAt: now,
    }
    rfps.push(record)

    // v1 import parsing (spec §3.1) runs on the backend against the uploaded
    // workbook; this mock seeds a representative question set so the rest of
    // the app is demoable without a real backend.
    const generalId = nextId('cat')
    const securityId = nextId('cat')
    categories.push({ id: generalId, rfpId: id, name: 'General', displayOrder: 0 })
    categories.push({ id: securityId, rfpId: id, name: 'Security', displayOrder: 1 })

    const seedQuestions: Array<{ categoryId: string; categoryName: string; text: string }> = [
      { categoryId: generalId, categoryName: 'General', text: 'Describe your company and years in the storage market.' },
      { categoryId: generalId, categoryName: 'General', text: 'What is your standard support SLA for production issues?' },
      { categoryId: securityId, categoryName: 'Security', text: 'Do you support encryption at rest and in transit?' },
      { categoryId: securityId, categoryName: 'Security', text: 'What certifications does your platform hold?' },
    ]
    seedQuestions.forEach((sq, index) => {
      questions.push({
        id: nextId('q'),
        rfpId: id,
        categoryId: sq.categoryId,
        categoryName: sq.categoryName,
        rowNumber: index + 1,
        questionText: sq.text,
        answerText: '',
        citation: null,
        answerSource: null,
        status: 'unanswered',
        gapNote: null,
        ownerTeamId: 'team-se',
        ownerName: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      })
    })

    return HttpResponse.json(
      { rfp: toRfpView(record), questionCount: seedQuestions.length, categoryCount: 2 },
      { status: 201 },
    )
  }),

  http.get('/api/rfps/:id', ({ params }) => {
    const rfp = rfps.find((r) => r.id === params.id)
    if (!rfp) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(toRfpView(rfp))
  }),

  http.patch('/api/rfps/:id', async ({ params, request }) => {
    const rfp = rfps.find((r) => r.id === params.id)
    if (!rfp) return new HttpResponse(null, { status: 404 })

    const input = (await request.json()) as UpdateRfpInput
    if (input.name !== undefined) rfp.name = input.name
    if (input.customer !== undefined) rfp.customer = input.customer
    if (input.dueDate !== undefined) rfp.dueDate = input.dueDate
    if (input.notes !== undefined) rfp.notes = input.notes
    if (input.status !== undefined) rfp.status = input.status
    if (input.decisionRationale !== undefined) rfp.decisionRationale = input.decisionRationale

    if (input.decision !== undefined) {
      rfp.decision = input.decision
      if (input.decision === 'bid') rfp.status = 'in_progress'
      else if (input.decision === 'no_bid') rfp.status = 'no_bid'
    }

    rfp.updatedAt = new Date().toISOString()
    return HttpResponse.json(toRfpView(rfp))
  }),

  http.delete('/api/rfps/:id', ({ params }) => {
    const index = rfps.findIndex((r) => r.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })
    rfps.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/rfps/:id/scope', ({ params }) => {
    const rfp = findRfp(params.id as string)
    if (!rfp) return new HttpResponse(null, { status: 404 })
    if (rfp.status === 'draft' || rfp.status === 'scoping') {
      rfp.status = 'scoping'
    }
    const result = recomputeScopingResult(rfp.id)
    return HttpResponse.json(result)
  }),

  http.get('/api/rfps/:id/scope', ({ params }) => {
    const result = scopingResults.get(params.id as string)
    return HttpResponse.json(result ?? null)
  }),

  http.post('/api/rfps/:id/answer', ({ params }) => {
    const rfp = findRfp(params.id as string)
    if (!rfp) return new HttpResponse(null, { status: 404 })
    const unanswered = questions.filter((q) => q.rfpId === rfp.id && q.status === 'unanswered')

    for (const question of unanswered) {
      const generated = generateAnswer(question)
      question.answerText = generated.answerText
      question.citation = generated.citation
      question.status = generated.status
      question.gapNote = generated.gapNote
      question.answerSource = generated.answerSource
      if (generated.ownerTeamId) question.ownerTeamId = generated.ownerTeamId
      question.updatedAt = new Date().toISOString()
    }

    maybeAdvanceToInReview(rfp)
    return HttpResponse.json(toRfpView(rfp))
  }),

  http.get('/api/rfps/:id/export', async ({ params, request }) => {
    const rfp = findRfp(params.id as string)
    if (!rfp) return new HttpResponse(null, { status: 404 })
    const url = new URL(request.url)
    const onlyApproved = url.searchParams.get('onlyApproved') === 'true'
    const includeExtraColumns = url.searchParams.get('includeExtraColumns') === 'true'

    const rfpQuestions = questions.filter((q) => q.rfpId === rfp.id)
    const blob = await buildExportWorkbook(rfpQuestions, { onlyApproved, includeExtraColumns })
    return new HttpResponse(blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${rfp.sourceFileName ?? `${rfp.name}.xlsx`}"`,
      },
    })
  }),

  // --- Questions ---------------------------------------------------------
  http.get('/api/rfps/:id/questions', ({ params, request }) => {
    const url = new URL(request.url)
    const filters = {
      status: url.searchParams.get('status') ?? undefined,
      ownerTeamId: url.searchParams.get('ownerTeamId') ?? undefined,
      categoryId: url.searchParams.get('categoryId') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    }
    return HttpResponse.json(groupQuestions(params.id as string, filters))
  }),

  http.post('/api/rfps/:id/questions', async ({ params, request }) => {
    const rfp = findRfp(params.id as string)
    if (!rfp) return new HttpResponse(null, { status: 404 })
    const input = (await request.json()) as CreateQuestionInput

    let category = categories.find((c) => c.rfpId === rfp.id && c.name === input.categoryName)
    if (!category) {
      const displayOrder = categories.filter((c) => c.rfpId === rfp.id).length
      category = { id: nextId('cat'), rfpId: rfp.id, name: input.categoryName, displayOrder }
      categories.push(category)
    }

    const rowNumber = questions.filter((q) => q.rfpId === rfp.id).length + 1
    const now = new Date().toISOString()
    const question: Question = {
      id: nextId('q'),
      rfpId: rfp.id,
      categoryId: category.id,
      categoryName: category.name,
      rowNumber,
      questionText: input.questionText,
      answerText: input.answerText ?? '',
      citation: null,
      answerSource: null,
      status: 'unanswered',
      gapNote: null,
      ownerTeamId: 'team-se',
      ownerName: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    }
    questions.push(question)
    return HttpResponse.json(question, { status: 201 })
  }),

  http.patch('/api/questions/:id', async ({ params, request }) => {
    const question = questions.find((q) => q.id === params.id)
    if (!question) return new HttpResponse(null, { status: 404 })

    const input = (await request.json()) as UpdateQuestionInput
    if (input.questionText !== undefined) question.questionText = input.questionText
    if (input.answerText !== undefined) question.answerText = input.answerText
    if (input.citation !== undefined) question.citation = input.citation
    if (input.status !== undefined) question.status = input.status
    if (input.ownerTeamId !== undefined) question.ownerTeamId = input.ownerTeamId
    if (input.ownerName !== undefined) question.ownerName = input.ownerName
    if (input.notes !== undefined) question.notes = input.notes
    question.updatedAt = new Date().toISOString()

    const rfp = findRfp(question.rfpId)
    if (rfp) maybeAdvanceToInReview(rfp)

    return HttpResponse.json(question)
  }),

  http.patch('/api/questions/bulk', async ({ request }) => {
    const input = (await request.json()) as BulkUpdateInput
    const updated: Question[] = []
    const affectedRfpIds = new Set<string>()
    for (const question of questions) {
      if (!input.questionIds.includes(question.id)) continue
      if (input.ownerTeamId !== undefined) question.ownerTeamId = input.ownerTeamId
      if (input.status !== undefined) question.status = input.status as QuestionStatus
      question.updatedAt = new Date().toISOString()
      updated.push(question)
      affectedRfpIds.add(question.rfpId)
    }
    for (const rfpId of affectedRfpIds) {
      const rfp = findRfp(rfpId)
      if (rfp) maybeAdvanceToInReview(rfp)
    }
    return HttpResponse.json(updated)
  }),

  http.delete('/api/questions/:id', ({ params }) => {
    const index = questions.findIndex((q) => q.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })
    questions.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/questions/:id/answer', async ({ params, request }) => {
    const question = questions.find((q) => q.id === params.id)
    if (!question) return new HttpResponse(null, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as { instruction?: string }
    const generated = generateAnswer(question, body.instruction)
    question.answerText = generated.answerText
    question.citation = generated.citation
    question.status = generated.status
    question.gapNote = generated.gapNote
    question.answerSource = generated.answerSource
    if (generated.ownerTeamId) question.ownerTeamId = generated.ownerTeamId
    question.updatedAt = new Date().toISOString()

    const rfp = findRfp(question.rfpId)
    if (rfp) maybeAdvanceToInReview(rfp)

    return HttpResponse.json(question)
  }),

  // --- Knowledge -----------------------------------------------------------
  http.get('/api/knowledge/documents', () => HttpResponse.json(knowledgeDocuments)),

  http.post('/api/knowledge/ingest', () => HttpResponse.json(knowledgeDocuments)),

  http.delete('/api/knowledge/documents/:id', ({ params }) => {
    const index = knowledgeDocuments.findIndex((d) => d.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })
    knowledgeDocuments.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/knowledge/search', ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const results: KnowledgePassage[] = knowledgeDocuments
      .filter((doc) => q.length === 0 || doc.title.toLowerCase().includes(q) || doc.tags.some((t) => t.includes(q)))
      .slice(0, 5)
      .map((doc, index) => ({
        documentId: doc.id,
        documentTitle: doc.title,
        heading: 'Overview',
        text: `Representative passage from "${doc.title}" relevant to "${q}".`,
        score: 1 - index * 0.12,
      }))
    return HttpResponse.json(results)
  }),

  // --- Configuration -------------------------------------------------------
  http.get('/api/owner-teams', () => HttpResponse.json(ownerTeams)),

  http.post('/api/owner-teams', async ({ request }) => {
    const input = (await request.json()) as CreateOwnerTeamInput
    const team = {
      id: nextId('team'),
      name: input.name,
      isDefault: false,
      displayOrder: ownerTeams.length,
      active: true,
    }
    ownerTeams.push(team)
    return HttpResponse.json(team, { status: 201 })
  }),

  http.patch('/api/owner-teams/:id', async ({ params, request }) => {
    const team = ownerTeams.find((t) => t.id === params.id)
    if (!team) return new HttpResponse(null, { status: 404 })
    const input = (await request.json()) as UpdateOwnerTeamInput
    if (input.name !== undefined) team.name = input.name
    if (input.active !== undefined) team.active = input.active
    if (input.displayOrder !== undefined) team.displayOrder = input.displayOrder
    return HttpResponse.json(team)
  }),

  http.delete('/api/owner-teams/:id', ({ params }) => {
    const index = ownerTeams.findIndex((t) => t.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })
    ownerTeams.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/bid-criteria', () => HttpResponse.json(bidCriteria)),

  http.patch('/api/bid-criteria/:id', async ({ params, request }) => {
    const criterion = bidCriteria.find((c) => c.id === params.id)
    if (!criterion) return new HttpResponse(null, { status: 404 })
    const input = (await request.json()) as UpdateBidCriterionInput
    if (input.enabled !== undefined) criterion.enabled = input.enabled
    if (input.importance !== undefined) criterion.importance = input.importance
    return HttpResponse.json(criterion)
  }),

  http.get('/api/scoping-settings', () => HttpResponse.json(scopingSettings)),

  http.patch('/api/scoping-settings', async ({ request }) => {
    const input = (await request.json()) as { threshold: Threshold }
    scopingSettings.threshold = input.threshold
    return HttpResponse.json(scopingSettings)
  }),

  http.get('/api/health', () => {
    const totalPassages = knowledgeDocuments.reduce((sum, d) => sum + d.passageCount, 0)
    return HttpResponse.json({
      version: '0.1.0-dev',
      llmProvider: 'stub',
      llmModel: 'stub-v1',
      embedProvider: 'local',
      knowledgeDocumentCount: knowledgeDocuments.length,
      knowledgePassageCount: totalPassages,
    })
  }),
]
