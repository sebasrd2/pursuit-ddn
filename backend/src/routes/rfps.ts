import { Router } from 'express'
import multer from 'multer'
import type { AppDeps } from '../appDeps.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import {
  getRfpRow,
  insertRfpRow,
  updateRfpRow,
  deleteRfpRow,
  listRfpRows,
  setSourceFilePath,
} from '../repositories/rfps.js'
import { listOwnerTeamRows } from '../repositories/ownerTeams.js'
import { getScopingRunRow } from '../repositories/scopingRuns.js'
import { toRfpView, toScopingResultView } from '../services/views.js'
import { parseXlsx, importQuestions } from '../services/import.js'
import { saveUploadedWorkbook } from '../files/store.js'
import { runScoping } from '../services/scopingRun.js'
import { answerAllUnanswered } from '../services/answerAll.js'
import { autoAdvanceStatus, maybeAdvanceToInReview } from '../services/rfpStatus.js'
import { buildExportWorkbook } from '../services/export.js'
import type { BidDecision, RfpStatus } from '../types.js'

const upload = multer({ storage: multer.memoryStorage() })

export function rfpsRouter(deps: AppDeps): Router {
  const router = Router()
  const { db } = deps

  router.get('/', (_req, res) => {
    res.json(listRfpRows(db).map((row) => toRfpView(db, row)))
  })

  router.post('/', upload.single('file'), async (req, res) => {
    const { name, customer, dueDate, notes } = req.body as Record<string, string | undefined>
    if (!name?.trim() || !customer?.trim()) throw new ValidationError('name and customer are required')
    if (!req.file) throw new ValidationError('An .xlsx file is required')

    const rows = await parseXlsx(req.file.buffer)

    const defaultOwnerTeam = listOwnerTeamRows(db).find((t) => t.is_default === 1)
    if (!defaultOwnerTeam) throw new Error('No default owner team is configured')

    const rfp = insertRfpRow(db, {
      name: name.trim(),
      customer: customer.trim(),
      dueDate: dueDate?.trim() || null,
      notes: notes?.trim() || null,
      sourceFileName: req.file.originalname,
      sourceFilePath: null,
    })

    const sourceFilePath = saveUploadedWorkbook(rfp.id, req.file.buffer)
    setSourceFilePath(db, rfp.id, sourceFilePath)

    const { questionCount, categoryCount } = importQuestions(db, rfp.id, rows, defaultOwnerTeam.id)

    const updated = getRfpRow(db, rfp.id)!
    res.status(201).json({ rfp: toRfpView(db, updated), questionCount, categoryCount })
  })

  router.get('/:id', (req, res) => {
    const rfp = getRfpRow(db, req.params.id!)
    if (!rfp) throw new NotFoundError('RFP')
    res.json(toRfpView(db, rfp))
  })

  router.patch('/:id', (req, res) => {
    const rfp = getRfpRow(db, req.params.id!)
    if (!rfp) throw new NotFoundError('RFP')

    const input = req.body as {
      name?: string
      customer?: string
      dueDate?: string | null
      notes?: string | null
      status?: RfpStatus
      decision?: BidDecision
      decisionRationale?: string | null
    }

    const patch: Parameters<typeof updateRfpRow>[2] = {}
    if (input.name !== undefined) patch.name = input.name
    if (input.customer !== undefined) patch.customer = input.customer
    if (input.dueDate !== undefined) patch.dueDate = input.dueDate
    if (input.notes !== undefined) patch.notes = input.notes
    if (input.decisionRationale !== undefined) patch.decisionRationale = input.decisionRationale

    if (input.decision !== undefined) {
      patch.decision = input.decision
      const target: RfpStatus = input.decision === 'no_bid' ? 'no_bid' : input.decision === 'bid' ? 'in_progress' : (rfp.status as RfpStatus)
      patch.status = autoAdvanceStatus(rfp.status as RfpStatus, target)
    }

    if (input.status !== undefined) {
      patch.status = input.status // explicit user override always wins (spec §5.1)
    }

    const updated = updateRfpRow(db, rfp.id, patch)!
    res.json(toRfpView(db, updated))
  })

  router.delete('/:id', (req, res) => {
    const deleted = deleteRfpRow(db, req.params.id!)
    if (!deleted) throw new NotFoundError('RFP')
    res.status(204).end()
  })

  router.post('/:id/scope', async (req, res) => {
    const rfp = getRfpRow(db, req.params.id!)
    if (!rfp) throw new NotFoundError('RFP')

    const advanced = autoAdvanceStatus(rfp.status as RfpStatus, 'scoping')
    if (advanced !== rfp.status) updateRfpRow(db, rfp.id, { status: advanced })

    await runScoping(db, deps.textProvider, deps.embedProvider, deps.retrievalTopK, rfp.id)
    res.json(toScopingResultView(getScopingRunRow(db, rfp.id)!))
  })

  router.get('/:id/scope', (req, res) => {
    const run = getScopingRunRow(db, req.params.id!)
    res.json(run ? toScopingResultView(run) : null)
  })

  router.post('/:id/answer', async (req, res) => {
    const rfp = getRfpRow(db, req.params.id!)
    if (!rfp) throw new NotFoundError('RFP')
    if (rfp.decision !== 'bid') throw new ValidationError('The RFP must be decided as "bid" before answering')

    await answerAllUnanswered(db, deps.textProvider, deps.embedProvider, deps.retrievalTopK, deps.llmDelayMs, rfp.id)
    maybeAdvanceToInReview(db, rfp.id)

    res.json(toRfpView(db, getRfpRow(db, rfp.id)!))
  })

  router.get('/:id/export', async (req, res) => {
    const rfp = getRfpRow(db, req.params.id!)
    if (!rfp) throw new NotFoundError('RFP')
    if (!rfp.source_file_path) throw new ValidationError('No source workbook is on file for this RFP')

    const onlyApproved = req.query.onlyApproved === 'true'
    const includeExtraColumns = req.query.includeExtraColumns === 'true'

    const buffer = await buildExportWorkbook(db, rfp.id, rfp.source_file_path, { onlyApproved, includeExtraColumns })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${rfp.source_file_name ?? `${rfp.name}.xlsx`}"`)
    res.send(buffer)
  })

  return router
}
