import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ProgressStepper } from '../components/ProgressStepper'
import { QuestionDetailPanel } from '../components/QuestionDetailPanel'
import { QuestionList } from '../components/QuestionList'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { TextField } from '../components/ui/TextField'
import type { QuestionStatus } from '../api/types'
import { QUESTION_STATUS_LABEL } from '../lib/labels'
import { useOwnerTeams } from '../queries/config'
import { useRfp } from '../queries/rfps'
import {
  useAnswerQuestion,
  useBulkUpdateQuestions,
  useQuestions,
  useUpdateQuestion,
} from '../queries/questions'
import styles from './QuestionsWorkspace.module.css'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...(Object.keys(QUESTION_STATUS_LABEL) as QuestionStatus[]).map((value) => ({
    value,
    label: QUESTION_STATUS_LABEL[value],
  })),
]

export function QuestionsWorkspace() {
  const { id = '' } = useParams()
  const { data: rfp, isError } = useRfp(id)
  const { data: ownerTeams = [] } = useOwnerTeams()

  const [status, setStatus] = useState('')
  const [ownerTeamId, setOwnerTeamId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOwner, setBulkOwner] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')

  const filters = {
    status: (status || undefined) as QuestionStatus | undefined,
    ownerTeamId: ownerTeamId || undefined,
    categoryId: categoryId || undefined,
    search: search || undefined,
  }
  const { data: groups = [] } = useQuestions(id, filters)
  const updateQuestion = useUpdateQuestion(id)
  const answerQuestion = useAnswerQuestion(id)
  const bulkUpdate = useBulkUpdateQuestions(id)

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...groups.map((g) => ({ value: g.categoryId, label: g.categoryName })),
    ],
    [groups],
  )
  const ownerFilterOptions = useMemo(
    () => [{ value: '', label: 'All owners' }, ...ownerTeams.map((t) => ({ value: t.id, label: t.name }))],
    [ownerTeams],
  )

  const selectedQuestion = useMemo(() => {
    for (const group of groups) {
      const found = group.questions.find((q) => q.id === selectedQuestionId)
      if (found) return found
    }
    return null
  }, [groups, selectedQuestionId])

  function toggleSelect(questionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  function applyBulk() {
    if (selectedIds.size === 0) return
    bulkUpdate.mutate(
      {
        questionIds: Array.from(selectedIds),
        ownerTeamId: bulkOwner || undefined,
        status: (bulkStatus || undefined) as QuestionStatus | undefined,
      },
      { onSuccess: () => setSelectedIds(new Set()) },
    )
  }

  if (isError) return <p>Couldn't load this RFP. It may have been deleted.</p>
  if (!rfp) return <p>Loading…</p>
  if (rfp.decision === 'no_bid') return <Navigate to={`/rfps/${id}`} replace />

  const counts = rfp.questionCounts
  const summary = `${counts.approved} approved · ${counts.aiAnswered + counts.inReview} to check · ${counts.needsInput} need input`

  return (
    <div>
      <div className={styles.header}>
        <Link to={`/rfps/${id}`} className={styles.backLink}>
          ← Back to overview
        </Link>
        <h1 className={styles.title}>{rfp.name}</h1>
        <p className={styles.summary}>{summary}</p>
        <Card style={{ marginBottom: 20 }}>
          <ProgressStepper currentStage={rfp.currentStage} />
        </Card>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchField}>
          <TextField label="Search" placeholder="Search questions" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select label="Status" value={status} onValueChange={setStatus} options={STATUS_FILTER_OPTIONS} />
        <Select label="Owner" value={ownerTeamId} onValueChange={setOwnerTeamId} options={ownerFilterOptions} />
        <Select label="Category" value={categoryId} onValueChange={setCategoryId} options={categoryOptions} />
        {status !== 'needs_input' && (
          <Button variant="secondary" onClick={() => setStatus('needs_input')}>
            Show needs input
          </Button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectedIds.size} selected</span>
          <Select
            label="Assign owner"
            value={bulkOwner}
            onValueChange={setBulkOwner}
            options={[{ value: '', label: 'Keep owner' }, ...ownerTeams.map((t) => ({ value: t.id, label: t.name }))]}
          />
          <Select
            label="Set status"
            value={bulkStatus}
            onValueChange={setBulkStatus}
            options={[{ value: '', label: 'Keep status' }, ...STATUS_FILTER_OPTIONS.slice(1)]}
          />
          <Button variant="primary" onClick={applyBulk} disabled={bulkUpdate.isPending || (!bulkOwner && !bulkStatus)}>
            Apply
          </Button>
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.listColumn}>
          <QuestionList
            groups={groups}
            selectedId={selectedQuestionId}
            onSelect={setSelectedQuestionId}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            ownerTeams={ownerTeams}
          />
        </div>
        <div className={styles.detailColumn}>
          <Card>
            <QuestionDetailPanel
              question={selectedQuestion}
              ownerTeams={ownerTeams}
              onUpdate={(input) => selectedQuestion && updateQuestion.mutate({ id: selectedQuestion.id, input })}
              onAnswer={(instruction) =>
                selectedQuestion && answerQuestion.mutate({ id: selectedQuestion.id, instruction })
              }
              isAnswering={answerQuestion.isPending}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
