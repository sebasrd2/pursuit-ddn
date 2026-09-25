import type { TextProvider } from './textProvider.js'

export type StubResponder = (systemPrompt: string, userPrompt: string) => unknown

/**
 * Deterministic text provider for tests (spec §15: no automated test calls a live provider).
 * Defaults to "never confident" so a test that forgets to configure a responder fails safe
 * rather than accidentally asserting a real answer was produced.
 */
export class StubTextProvider implements TextProvider {
  readonly name = 'stub'
  readonly model = 'stub'
  #respond: StubResponder

  constructor(respond: StubResponder = () => ({ confident: false })) {
    this.#respond = respond
  }

  async generateJson(systemPrompt: string, userPrompt: string): Promise<unknown> {
    return this.#respond(systemPrompt, userPrompt)
  }
}
