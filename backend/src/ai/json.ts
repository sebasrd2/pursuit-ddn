export class ProviderJsonError extends Error {}

/** Extracts a JSON object from an LLM response, tolerating markdown code fences around it. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1]! : text

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new ProviderJsonError(`No JSON object found in provider response: ${text.slice(0, 200)}`)
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    throw new ProviderJsonError(`Provider response was not valid JSON: ${text.slice(0, 200)}`)
  }
}
