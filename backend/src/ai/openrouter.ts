import { extractJson, ProviderJsonError } from './json.js'
import { ProviderError, type TextProvider } from './textProvider.js'

interface OpenRouterOptions {
  apiKey: string
  model: string
  maxRetries: number
  /** Base backoff unit, also reused as the standard pacing delay between distinct calls. */
  delayMs: number
}

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class OpenRouterProvider implements TextProvider {
  readonly name = 'openrouter'
  readonly model: string
  #apiKey: string
  #maxRetries: number
  #delayMs: number

  constructor(options: OpenRouterOptions) {
    this.model = options.model
    this.#apiKey = options.apiKey
    this.#maxRetries = options.maxRetries
    this.#delayMs = options.delayMs
  }

  async generateJson(systemPrompt: string, userPrompt: string): Promise<unknown> {
    let lastError: unknown

    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(this.#delayMs * attempt)
      }

      let response: Response
      try {
        response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.#apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        })
      } catch (cause) {
        lastError = cause
        continue
      }

      if (response.status === 429 || response.status >= 500) {
        lastError = new ProviderError(`OpenRouter returned ${response.status}`)
        continue
      }

      if (!response.ok) {
        const body = await response.text().catch(() => response.statusText)
        throw new ProviderError(`OpenRouter request failed (${response.status}): ${body}`)
      }

      const payload = (await response.json()) as {
        error?: { message?: string; code?: number }
        choices?: { message?: { content?: string } }[]
      }

      // OpenRouter sometimes reports a provider-side error (e.g. a free model overloaded
      // or rate-limited) as a 200 response with an `error` body instead of an HTTP error
      // status — treat that the same as a retryable 429/5xx.
      if (payload.error) {
        lastError = new ProviderError(`OpenRouter provider error: ${payload.error.message ?? 'unknown'}`)
        continue
      }

      const content = payload.choices?.[0]?.message?.content
      if (!content) {
        // Also seen from free/overloaded models: a 200 with empty choices — retry rather
        // than fail the whole "answer all" run on what's usually a transient hiccup.
        lastError = new ProviderError('OpenRouter response had no message content')
        continue
      }

      try {
        return extractJson(content)
      } catch (cause) {
        if (cause instanceof ProviderJsonError) {
          lastError = cause
          continue
        }
        throw cause
      }
    }

    throw new ProviderError(
      `OpenRouter call failed after ${this.#maxRetries + 1} attempts: ${String(lastError)}`,
    )
  }
}
