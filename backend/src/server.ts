import { env } from './config/env.js'
import { getDb } from './db/connection.js'
import { createTextProvider, createEmbedProvider } from './ai/index.js'
import { createApp } from './app.js'
import type { AppDeps } from './appDeps.js'

const deps: AppDeps = {
  db: getDb(),
  textProvider: createTextProvider(),
  embedProvider: createEmbedProvider(),
  retrievalTopK: env.retrievalTopK,
  llmDelayMs: env.llmDelayMs,
  knowledgePath: env.knowledgePath,
  webAllowedDomains: env.webAllowedDomains,
}

const app = createApp(deps)

app.listen(env.port, env.bind, () => {
  console.log(`Pursuit backend listening on http://${env.bind}:${env.port}`)
  console.log(`LLM provider: ${deps.textProvider.name} (${deps.textProvider.model})`)
  console.log(`Embedding provider: ${deps.embedProvider.name}`)
})
