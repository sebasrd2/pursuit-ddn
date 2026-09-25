import { Router } from 'express'
import type { AppDeps } from '../appDeps.js'
import { ValidationError, NotFoundError } from '../utils/errors.js'
import { listKnowledgeDocumentRows, deleteKnowledgeDocumentRow } from '../repositories/knowledgeDocuments.js'
import { toKnowledgeDocumentView } from '../services/views.js'
import { ingestAll } from '../knowledge/ingest.js'
import { retrieve } from '../knowledge/retrieve.js'

export function knowledgeRouter(deps: AppDeps): Router {
  const router = Router()
  const { db } = deps

  router.get('/documents', (_req, res) => {
    res.json(listKnowledgeDocumentRows(db).map(toKnowledgeDocumentView))
  })

  router.post('/ingest', async (_req, res) => {
    await ingestAll(db, deps.embedProvider, deps.knowledgePath, deps.webAllowedDomains)
    res.json(listKnowledgeDocumentRows(db).map(toKnowledgeDocumentView))
  })

  router.delete('/documents/:id', (req, res) => {
    const deleted = deleteKnowledgeDocumentRow(db, req.params.id!)
    if (!deleted) throw new NotFoundError('Knowledge document')
    res.status(204).end()
  })

  router.get('/search', async (req, res) => {
    const query = req.query.q as string | undefined
    if (!query?.trim()) throw new ValidationError('q is required')
    res.json(await retrieve(db, deps.embedProvider, query, deps.retrievalTopK))
  })

  return router
}
