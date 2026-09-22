import type { CategoryGroup } from '../api/questions'
import type { OwnerTeam } from '../api/types'
import { QUESTION_STATUS_LABEL, QUESTION_STATUS_TONE } from '../lib/labels'
import { Pill } from './ui/Pill'
import styles from './QuestionList.module.css'

interface QuestionListProps {
  groups: CategoryGroup[]
  selectedId: string | null
  onSelect: (id: string) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  ownerTeams: OwnerTeam[]
}

export function QuestionList({
  groups,
  selectedId,
  onSelect,
  selectedIds,
  onToggleSelect,
  ownerTeams,
}: QuestionListProps) {
  const ownerName = (id: string) => ownerTeams.find((t) => t.id === id)?.name ?? id

  if (groups.every((g) => g.total === 0)) {
    return <p className={styles.empty}>No questions match the current filters.</p>
  }

  return (
    <div className={styles.list}>
      {groups.map((group) =>
        group.total === 0 ? null : (
          <details key={group.categoryId} className={styles.group} open>
            <summary className={styles.groupHeader}>
              <span>{group.categoryName}</span>
              <span className={styles.groupCount}>
                {group.completed}/{group.total}
              </span>
            </summary>
            <ul className={styles.rows}>
              {group.questions.map((question) => (
                <li
                  key={question.id}
                  className={[styles.row, question.id === selectedId ? styles.rowSelected : ''].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(question.id)}
                    onChange={() => onToggleSelect(question.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select question: ${question.questionText}`}
                  />
                  <button type="button" className={styles.rowMain} onClick={() => onSelect(question.id)}>
                    <span className={styles.rowText}>
                      {!question.answerText && <span className={styles.emptyDot} title="No answer yet" />}
                      {question.questionText}
                    </span>
                    <span className={styles.rowMeta}>
                      <span className={styles.owner}>{ownerName(question.ownerTeamId)}</span>
                      <Pill tone={QUESTION_STATUS_TONE[question.status]}>
                        {QUESTION_STATUS_LABEL[question.status]}
                      </Pill>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ),
      )}
    </div>
  )
}
