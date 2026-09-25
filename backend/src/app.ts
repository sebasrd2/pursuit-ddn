import express, { type Express, type ErrorRequestHandler } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import type { AppDeps } from './appDeps.js'
import { rfpsRouter } from './routes/rfps.js'
import { questionsRouter } from './routes/questions.js'
import { knowledgeRouter } from './routes/knowledge.js'
import { configRouter } from './routes/config.js'
import { HttpError } from './utils/errors.js'

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
}

export function createApp(deps: AppDeps): Express {
  const app = express()
  app.use(express.json())

  app.use('/api/rfps', rfpsRouter(deps))
  app.use('/api', questionsRouter(deps))
  app.use('/api/knowledge', knowledgeRouter(deps))
  app.use('/api', configRouter(deps))

  // Production: the frontend is built to static files and served from the same
  // process/port (spec §11.2) — "one container, one process, one port".
  const frontendDist = path.resolve(import.meta.dirname, '..', '..', 'frontend', 'dist')
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}
