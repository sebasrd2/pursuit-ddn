// Reads and validates the environment variables documented in .env.example
// and planning/pursuit-spec.md §13.

import path from 'node:path'

// This service's source lives at <repo root>/backend/src/config — three levels down.
const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

// The .env file lives at the repo root.
try {
  process.loadEnvFile(path.join(REPO_ROOT, '.env'))
} catch {
  // No .env file (e.g. CI, or PURSUIT_* vars supplied directly) — fine, defaults apply.
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

function required(name: string): string | undefined {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

export const env = {
  llmProvider: optional('PURSUIT_LLM_PROVIDER', 'openrouter') as 'openrouter' | 'stub',
  llmModel: optional('PURSUIT_LLM_MODEL', 'dots-studio/dots-3-note-preview:free'),
  llmApiKey: required('PURSUIT_LLM_API_KEY'),
  llmDelayMs: Number(optional('PURSUIT_LLM_DELAY_MS', '1500')),
  llmMaxRetries: Number(optional('PURSUIT_LLM_MAX_RETRIES', '5')),

  embedProvider: optional('PURSUIT_EMBED_PROVIDER', 'local') as 'local' | 'stub',
  embedModel: optional('PURSUIT_EMBED_MODEL', 'Xenova/all-MiniLM-L6-v2'),
  retrievalTopK: Number(optional('PURSUIT_RETRIEVAL_TOP_K', '8')),

  webLookup: optional('PURSUIT_WEB_LOOKUP', 'on') === 'on',
  webAllowedDomains: optional('PURSUIT_WEB_ALLOWED_DOMAINS', 'ddn.com')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean),

  databaseUrl: optional('PURSUIT_DATABASE_URL', ''),
  // Defaults are resolved against the repo root, not process.cwd() — this service is
  // launched from backend/ (npm scripts, scripts/dev.sh, scripts/start.sh), and a bare
  // relative path would otherwise silently point at backend/data or backend/knowledge.
  fileStorePath: path.resolve(REPO_ROOT, optional('PURSUIT_FILE_STORE_PATH', './data')),
  knowledgePath: path.resolve(REPO_ROOT, optional('PURSUIT_KNOWLEDGE_PATH', './knowledge')),

  bind: optional('PURSUIT_BIND', '127.0.0.1'),
  port: Number(optional('PURSUIT_PORT', '8080')),
}
