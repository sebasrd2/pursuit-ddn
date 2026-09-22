import type { Question } from '../api/types'
import { knowledgeDocuments } from './fixtures'

const UNCERTAIN_PATTERN = /price|pricing|roadmap|certif|guarantee|maximum|support hours/i
const SECURITY_PATTERN = /secur|complian|encrypt|hipaa|fedramp|gdpr|audit/i
const LEGAL_PATTERN = /contract|liability|indemnif|warrant|terms/i
const FINANCE_PATTERN = /price|pricing|cost|invoice|payment terms/i

let citationCursor = 0
function nextCitation(): string {
  const doc = knowledgeDocuments[citationCursor % knowledgeDocuments.length]
  citationCursor += 1
  return doc.title
}

export interface GeneratedAnswer {
  answerText: string
  citation: string | null
  status: 'ai_answered' | 'needs_input'
  gapNote: string | null
  ownerTeamId: string | null
  answerSource: 'ai' | null
}

export function generateAnswer(question: Question, instruction?: string): GeneratedAnswer {
  const text = question.questionText

  if (UNCERTAIN_PATTERN.test(text)) {
    let ownerTeamId: string | null = null
    if (FINANCE_PATTERN.test(text)) ownerTeamId = 'team-finance'
    else if (SECURITY_PATTERN.test(text)) ownerTeamId = 'team-security'

    return {
      answerText: '',
      citation: null,
      status: 'needs_input',
      gapNote: `No supporting passage in the knowledge base or an allowed DDN domain answers this with high confidence: "${text}"`,
      ownerTeamId,
      answerSource: null,
    }
  }

  let ownerTeamId: string | null = null
  if (SECURITY_PATTERN.test(text)) ownerTeamId = 'team-security'
  else if (LEGAL_PATTERN.test(text)) ownerTeamId = 'team-legal'

  const base = `Based on current DDN product documentation, this requirement is supported.`
  const answerText = instruction
    ? `${base} (${instruction.toLowerCase().includes('short') ? 'Yes.' : base})`
    : base

  return {
    answerText,
    citation: nextCitation(),
    status: 'ai_answered',
    gapNote: null,
    ownerTeamId,
    answerSource: 'ai',
  }
}
