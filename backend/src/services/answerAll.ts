import type Database from 'better-sqlite3'
import type { TextProvider } from '../ai/textProvider.js'
import type { EmbedProvider } from '../ai/embedProvider.js'
import { ProviderError } from '../ai/textProvider.js'
import { listQuestionRows, updateQuestionRow } from '../repositories/questions.js'
import { answerQuestion } from './answering.js'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Answers every unanswered question in the RFP, one at a time (spec §3.4 "Answer all").
 * If the provider becomes unavailable partway through, already-answered questions keep
 * their answers and the run simply stops — the user retries later to continue with the
 * rest (spec §7), rather than every remaining call failing the same way.
 */
export async function answerAllUnanswered(
  db: Database.Database,
  textProvider: TextProvider,
  embedProvider: EmbedProvider,
  retrievalTopK: number,
  delayMs: number,
  rfpId: string,
): Promise<void> {
  const unanswered = listQuestionRows(db, rfpId).filter((q) => q.status === 'unanswered')

  for (let i = 0; i < unanswered.length; i++) {
    const question = unanswered[i]!
    let generated
    try {
      generated = await answerQuestion(db, textProvider, embedProvider, retrievalTopK, question)
    } catch (error) {
      if (error instanceof ProviderError) {
        console.warn(
          `answer-all stopped after ${i}/${unanswered.length} questions (rfp ${rfpId}): ${error.message}`,
        )
        break
      }
      throw error
    }

    updateQuestionRow(db, question.id, {
      answerText: generated.answerText,
      citation: generated.citation,
      status: generated.status,
      gapNote: generated.gapNote,
      answerSource: generated.answerSource,
      ...(generated.ownerTeamId ? { ownerTeamId: generated.ownerTeamId } : {}),
    })

    if (i < unanswered.length - 1) await sleep(delayMs)
  }
}
