import { env } from '../config/env.js'
import { OpenRouterProvider } from './openrouter.js'
import { StubTextProvider } from './stubTextProvider.js'
import { LocalEmbedProvider } from './localEmbedProvider.js'
import { StubEmbedProvider } from './stubEmbedProvider.js'
import type { TextProvider } from './textProvider.js'
import type { EmbedProvider } from './embedProvider.js'

export function createTextProvider(): TextProvider {
  if (env.llmProvider === 'stub') return new StubTextProvider()

  if (!env.llmApiKey) {
    throw new Error('PURSUIT_LLM_API_KEY is required when PURSUIT_LLM_PROVIDER=openrouter')
  }
  return new OpenRouterProvider({
    apiKey: env.llmApiKey,
    model: env.llmModel,
    maxRetries: env.llmMaxRetries,
    delayMs: env.llmDelayMs,
  })
}

export function createEmbedProvider(): EmbedProvider {
  if (env.embedProvider === 'stub') return new StubEmbedProvider()
  return new LocalEmbedProvider(env.embedModel)
}

export type { TextProvider } from './textProvider.js'
export type { EmbedProvider } from './embedProvider.js'
export { ProviderError } from './textProvider.js'
