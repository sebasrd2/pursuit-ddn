import { Router } from 'express'
import type { AppDeps } from '../appDeps.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import {
  listOwnerTeamRows,
  insertOwnerTeamRow,
  updateOwnerTeamRow,
  deleteOwnerTeamRow,
} from '../repositories/ownerTeams.js'
import { listBidCriterionRows, updateBidCriterionRow } from '../repositories/bidCriteria.js'
import { getThreshold, updateThreshold } from '../repositories/scopingSettings.js'
import { countKnowledgeDocuments } from '../repositories/knowledgeDocuments.js'
import { countKnowledgePassages } from '../repositories/knowledgePassages.js'
import { toOwnerTeamView, toBidCriterionView } from '../services/views.js'
import type { Importance, Threshold } from '../types.js'

const VERSION = '1.0.0'

export function configRouter(deps: AppDeps): Router {
  const router = Router()
  const { db } = deps

  router.get('/owner-teams', (_req, res) => {
    res.json(listOwnerTeamRows(db).map(toOwnerTeamView))
  })

  router.post('/owner-teams', (req, res) => {
    const { name } = req.body as { name?: string }
    if (!name?.trim()) throw new ValidationError('name is required')
    res.status(201).json(toOwnerTeamView(insertOwnerTeamRow(db, name.trim())))
  })

  router.patch('/owner-teams/:id', (req, res) => {
    const { name, active, displayOrder } = req.body as { name?: string; active?: boolean; displayOrder?: number }
    const updated = updateOwnerTeamRow(db, req.params.id!, { name, active, displayOrder })
    if (!updated) throw new NotFoundError('Owner team')
    res.json(toOwnerTeamView(updated))
  })

  router.delete('/owner-teams/:id', (req, res) => {
    const deleted = deleteOwnerTeamRow(db, req.params.id!)
    if (!deleted) throw new NotFoundError('Owner team')
    res.status(204).end()
  })

  router.get('/bid-criteria', (_req, res) => {
    res.json(listBidCriterionRows(db).map(toBidCriterionView))
  })

  router.patch('/bid-criteria/:id', (req, res) => {
    const { enabled, importance } = req.body as { enabled?: boolean; importance?: Importance }
    const updated = updateBidCriterionRow(db, req.params.id!, { enabled, importance })
    if (!updated) throw new NotFoundError('Bid criterion')
    res.json(toBidCriterionView(updated))
  })

  router.get('/scoping-settings', (_req, res) => {
    res.json({ threshold: getThreshold(db) })
  })

  router.patch('/scoping-settings', (req, res) => {
    const { threshold } = req.body as { threshold?: Threshold }
    if (!threshold) throw new ValidationError('threshold is required')
    updateThreshold(db, threshold)
    res.json({ threshold })
  })

  router.get('/health', (_req, res) => {
    res.json({
      version: VERSION,
      llmProvider: deps.textProvider.name,
      llmModel: deps.textProvider.model,
      embedProvider: deps.embedProvider.name,
      knowledgeDocumentCount: countKnowledgeDocuments(db),
      knowledgePassageCount: countKnowledgePassages(db),
    })
  })

  return router
}
