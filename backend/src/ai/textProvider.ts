export class ProviderError extends Error {}

export interface TextProvider {
  readonly name: string
  readonly model: string
  /** Sends a prompt and returns the parsed JSON object the model replied with. */
  generateJson(systemPrompt: string, userPrompt: string): Promise<unknown>
}
