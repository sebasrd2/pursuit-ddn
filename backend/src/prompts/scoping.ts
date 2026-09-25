import type { KnowledgePassage } from '../types.js'

function formatPassages(passages: KnowledgePassage[]): string {
  if (passages.length === 0) return '(No relevant passages were found in the knowledge base.)'
  return passages
    .map((p, i) => `[${i + 1}] ${p.documentTitle} — ${p.heading}\n${p.text}`)
    .join('\n\n')
}

const SYSTEM_PROMPT = `You are assessing an RFP against one bid/no-bid criterion for a storage
company (DDN), using only the supplied knowledge-base passages as evidence. Never use
outside knowledge — if the passages don't address the criterion, say so honestly. Reply
with a single JSON object and nothing else.`

export function buildCriterionPrompt(input: {
  criterionName: string
  criterionDescription: string
  rfpSummary: string
  passages: KnowledgePassage[]
}): { systemPrompt: string; userPrompt: string } {
  const userPrompt = `Criterion: ${input.criterionName}
Definition: ${input.criterionDescription}

RFP requirements summary:
${input.rfpSummary}

Knowledge base passages:
${formatPassages(input.passages)}

Assess this criterion using only the passages above. Reply with exactly this JSON shape:
{
  "assessment": "strong" | "partial" | "weak" | "not_assessed",
  "evidence": string | null,
  "reasoning": string
}
Use "not_assessed" if the passages don't say enough to judge this criterion — never guess.`

  return { systemPrompt: SYSTEM_PROMPT, userPrompt }
}

const DISQUALIFIER_SYSTEM_PROMPT = `You are checking whether an RFP states a mandatory
requirement that DDN's products cannot meet at all, using only the supplied knowledge-base
passages as evidence of what DDN can and cannot do. Reply with a single JSON object and
nothing else.`

export function buildDisqualifierPrompt(input: {
  rfpSummary: string
  passages: KnowledgePassage[]
}): { systemPrompt: string; userPrompt: string } {
  const userPrompt = `RFP requirements summary:
${input.rfpSummary}

Knowledge base passages:
${formatPassages(input.passages)}

Does the RFP state a mandatory requirement that the passages show DDN cannot meet at all?
Reply with exactly this JSON shape:
{
  "triggered": boolean,
  "evidence": string | null,
  "reasoning": string
}
Only set "triggered": true if a passage directly shows DDN cannot meet a stated mandatory
requirement — otherwise false.`

  return { systemPrompt: DISQUALIFIER_SYSTEM_PROMPT, userPrompt }
}
