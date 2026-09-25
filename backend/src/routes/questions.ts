import { Router } from 'express'
import type { AppDeps } from '../appDeps.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import { getRfpRow } from '../repositories/rfps.js'
import { listCategoryRows, findOrCreateCategory, getCategoryRow } from '../repositories/categories.js'
import { listOwnerTeamRows } from '../repositories/ownerTeams.js'
import {
  listFilteredQuestionRows,
  getQuestionRow,
  insertQuestionRow,
  updateQuestionRow,
  deleteQuestionRow,
  listQuestionRows,
  type QuestionFilters,
} from '../repositories/questions.js'
import { toQuestionView } from '../services/views.js'
import { answerQuestion } from '../services/answering.js'
import { maybeAdvanceToInReview } from '../services/rfpStatus.js'
import type { QuestionStatus } from '../types.js'

export function questionsRouter(deps: AppDeps): Router {
  const router = Router()
  const { db } = deps

  router.get('/rfps/:rfpId/questions', (req, res) => {
    const rfpId = req.params.rfpId!
    if (!getRfpRow(db, rfpId)) throw new NotFoundError('RFP')

    const filters: QuestionFilters = {
      status: (req.query.status as string) || undefined,
      ownerTeamId: (req.query.ownerTeamId as string) || undefined,
      categoryId: (req.query.categoryId as string) || undefined,
      search: (req.query.search as string) || undefined,
    }

    const categories = listCategoryRows(db, rfpId)
    const questions = listFilteredQuestionRows(db, rfpId, filters)
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

    const groups = categories.map((category) => {
      const categoryQuestions = questions
        .filter((q) => q.category_id === category.id)
        .sort((a, b) => a.row_number - b.row_number)
      const completed = categoryQuestions.filter((q) => q.status === 'approved' || q.status === 'not_applicable').length

      return {
        categoryId: category.id,
        categoryName: category.name,
        displayOrder: category.display_order,
        questions: categoryQuestions.map((q) => toQuestionView(q, categoryNameById.get(q.category_id)!)),
        completed,
        total: categoryQuestions.length,
      }
    })

    res.json(groups)
  })

  router.post('/rfps/:rfpId/questions', (req, res) => {
    const rfpId = req.params.rfpId!
    if (!getRfpRow(db, rfpId)) throw new NotFoundError('RFP')

    const { categoryName, questionText, answerText } = req.body as {
      categoryName?: string
      questionText?: string
      answerText?: string
    }
    if (!categoryName?.trim() || !questionText?.trim()) {
      throw new ValidationError('categoryName and questionText are required')
    }

    const category = findOrCreateCategory(db, rfpId, categoryName.trim())
    const defaultOwnerTeam = listOwnerTeamRows(db).find((t) => t.is_default === 1)
    if (!defaultOwnerTeam) throw new Error('No default owner team is configured')

    const nextRowNumber = listQuestionRows(db, rfpId).length + 1
    const question = insertQuestionRow(db, {
      rfpId,
      categoryId: category.id,
      rowNumber: nextRowNumber,
      questionText: questionText.trim(),
      answerText: answerText?.trim() ?? '',
      ownerTeamId: defaultOwnerTeam.id,
    })

    res.status(201).json(toQuestionView(question, category.name))
  })

  router.patch('/questions/bulk', (req, res) => {
    const { questionIds, ownerTeamId, status } = req.body as {
      questionIds?: string[]
      ownerTeamId?: string
      status?: QuestionStatus
    }
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      throw new ValidationError('questionIds is required')
    }

    const affectedRfpIds = new Set<string>()
    const updated = questionIds.map((id) => {
      const question = getQuestionRow(db, id)
      if (!question) throw new NotFoundError('Question')
      affectedRfpIds.add(question.rfp_id)
      const row = updateQuestionRow(db, id, { ownerTeamId, status })!
      return toQuestionView(row, findCategoryName(db, row.category_id))
    })

    for (const rfpId of affectedRfpIds) maybeAdvanceToInReview(db, rfpId)

    res.json(updated)
  })

  router.patch('/questions/:id', (req, res) => {
    const existing = getQuestionRow(db, req.params.id!)
    if (!existing) throw new NotFoundError('Question')

    const { questionText, answerText, citation, status, ownerTeamId, ownerName, notes } = req.body as {
      questionText?: string
      answerText?: string
      citation?: string | null
      status?: QuestionStatus
      ownerTeamId?: string
      ownerName?: string | null
      notes?: string | null
    }

    // A human editing an AI-produced (or already-mixed) answer makes it "mixed"; editing an
    // answer that was never AI-generated makes it "human" (spec §8 defines the three values
    // but not the transitions between them — this is the natural reading of "mixed").
    const answerSource =
      answerText !== undefined
        ? existing.answer_source === 'ai' || existing.answer_source === 'mixed'
          ? 'mixed'
          : 'human'
        : undefined

    const updated = updateQuestionRow(db, existing.id, {
      questionText,
      answerText,
      citation,
      status,
      ownerTeamId,
      ownerName,
      notes,
      answerSource,
    })!

    maybeAdvanceToInReview(db, updated.rfp_id)
    res.json(toQuestionView(updated, findCategoryName(db, updated.category_id)))
  })

  router.delete('/questions/:id', (req, res) => {
    const deleted = deleteQuestionRow(db, req.params.id!)
    if (!deleted) throw new NotFoundError('Question')
    res.status(204).end()
  })

  router.post('/questions/:id/answer', async (req, res) => {
    const question = getQuestionRow(db, req.params.id!)
    if (!question) throw new NotFoundError('Question')

    const { instruction } = (req.body ?? {}) as { instruction?: string }
    const generated = await answerQuestion(db, deps.textProvider, deps.embedProvider, deps.retrievalTopK, question, instruction)

    const updated = updateQuestionRow(db, question.id, {
      answerText: generated.answerText,
      citation: generated.citation,
      status: generated.status,
      gapNote: generated.gapNote,
      answerSource: generated.answerSource,
      ...(generated.ownerTeamId ? { ownerTeamId: generated.ownerTeamId } : {}),
    })!

    maybeAdvanceToInReview(db, updated.rfp_id)
    res.json(toQuestionView(updated, findCategoryName(db, updated.category_id)))
  })

  function findCategoryName(dbArg: typeof db, categoryId: string): string {
    return getCategoryRow(dbArg, categoryId)?.name ?? ''
  }

  return router
}
