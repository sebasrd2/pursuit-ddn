import { useState } from 'react'
import type { UpdateQuestionInput } from '../api/questions'
import type { OwnerTeam, Question, QuestionStatus } from '../api/types'
import { useDebouncedSave } from '../lib/useDebouncedSave'
import { QUESTION_STATUS_LABEL } from '../lib/labels'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import { Textarea } from './ui/Textarea'
import { TextField } from './ui/TextField'
import styles from './QuestionDetailPanel.module.css'

const STATUS_OPTIONS = (Object.keys(QUESTION_STATUS_LABEL) as QuestionStatus[]).map((value) => ({
  value,
  label: QUESTION_STATUS_LABEL[value],
}))

interface QuestionDetailPanelProps {
  question: Question | null
  ownerTeams: OwnerTeam[]
  onUpdate: (input: UpdateQuestionInput) => void
  onAnswer: (instruction?: string) => void
  isAnswering: boolean
}

export function QuestionDetailPanel({
  question,
  ownerTeams,
  onUpdate,
  onAnswer,
  isAnswering,
}: QuestionDetailPanelProps) {
  const [instruction, setInstruction] = useState('')
  const [answerText, setAnswerText] = useDebouncedSave(
    question?.answerText ?? '',
    (value) => onUpdate({ answerText: value }),
  )

  if (!question) {
    return <p className={styles.empty}>Select a question to review or edit it.</p>
  }

  const ownerOptions = ownerTeams.filter((t) => t.active).map((t) => ({ value: t.id, label: t.name }))

  return (
    <div key={question.id} className={styles.panel}>
      <h3 className={styles.question}>{question.questionText}</h3>

      <div className={styles.controls}>
        <Select
          label="Owner"
          value={question.ownerTeamId}
          onValueChange={(ownerTeamId) => onUpdate({ ownerTeamId })}
          options={ownerOptions}
        />
        <Select
          label="Status"
          value={question.status}
          onValueChange={(status) => onUpdate({ status: status as QuestionStatus })}
          options={STATUS_OPTIONS}
        />
      </div>

      <Textarea
        label="Answer"
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        rows={8}
      />

      {question.citation && (
        <p className={styles.citation}>
          <span className={styles.citationLabel}>Citation:</span> {question.citation}
        </p>
      )}

      {question.gapNote && (
        <div className={styles.gapNote}>
          <span className={styles.gapNoteLabel}>Gap note</span>
          <p>{question.gapNote}</p>
        </div>
      )}

      <div className={styles.regenerate}>
        <TextField
          label="Instruction (optional)"
          hideLabel
          placeholder='Optional instruction, e.g. "shorter"'
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
        />
        <Button variant="secondary" onClick={() => onAnswer(instruction || undefined)} disabled={isAnswering}>
          {isAnswering ? 'Generating…' : question.answerText ? 'Regenerate' : 'Answer this one'}
        </Button>
      </div>
    </div>
  )
}
