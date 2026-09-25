import type { KnowledgePassage } from '../types.js'

function formatPassages(passages: KnowledgePassage[]): string {
  if (passages.length === 0) return '(No relevant passages were found in the knowledge base.)'
  return passages
    .map((p, i) => `[${i + 1}] ${p.documentTitle} — ${p.heading}\n${p.text}`)
    .join('\n\n')
}

const SYSTEM_PROMPT = `You are answering one question from an RFP on behalf of DDN, a data
storage company, using only the supplied knowledge-base passages as your source. This is
the single most important rule you must follow:

Answer ONLY if a passage directly and confidently supports a complete answer. If the
passages don't support a confident answer, you MUST say so — do not guess, infer, combine
unrelated facts, or extrapolate. Never state a capacity, throughput, latency,
certification, price, roadmap date, or product capability that is not explicitly stated in
a passage. A partially-relevant passage is not enough for confidence.

Reply with a single JSON object and nothing else.`

export function buildAnswerPrompt(input: {
  questionText: string
  instruction?: string
  passages: KnowledgePassage[]
}): { systemPrompt: string; userPrompt: string } {
  const instructionLine = input.instruction ? `\nAdditional instruction: ${input.instruction}` : ''

  const userPrompt = `Question: ${input.questionText}${instructionLine}

Knowledge base passages:
${formatPassages(input.passages)}

Reply with exactly this JSON shape:
{
  "confident": boolean,
  "answer": string,
  "citationDocumentTitle": string | null,
  "citationHeading": string | null,
  "gapNote": string | null,
  "suggestedOwnerTeam": string | null
}
If "confident" is false, "answer" must be an empty string and "gapNote" must explain what
information would be needed to answer it. "suggestedOwnerTeam" should only be set when the
question clearly belongs to a specific non-technical team (e.g. "Legal", "Finance",
"Security & Compliance") — otherwise leave it null.`

  return { systemPrompt: SYSTEM_PROMPT, userPrompt }
}
