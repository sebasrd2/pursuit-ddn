import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CategoryGroup } from '../api/questions'
import type { OwnerTeam, Question } from '../api/types'
import { QuestionList } from './QuestionList'

const ownerTeams: OwnerTeam[] = [
  { id: 'team-se', name: 'Sales Engineer (SE)', isDefault: true, displayOrder: 0, active: true },
]

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'q-1',
    rfpId: 'rfp-1',
    categoryId: 'cat-1',
    categoryName: 'General',
    rowNumber: 1,
    questionText: 'Describe your company.',
    answerText: '',
    citation: null,
    answerSource: null,
    status: 'unanswered',
    gapNote: null,
    ownerTeamId: 'team-se',
    ownerName: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

const groups: CategoryGroup[] = [
  {
    categoryId: 'cat-1',
    categoryName: 'General',
    displayOrder: 0,
    total: 2,
    completed: 1,
    questions: [
      makeQuestion({ id: 'q-1', questionText: 'Describe your company.', status: 'approved', answerText: 'Yes.' }),
      makeQuestion({ id: 'q-2', questionText: 'What is your SLA?', status: 'unanswered', answerText: '' }),
    ],
  },
  {
    categoryId: 'cat-2',
    categoryName: 'Security',
    displayOrder: 1,
    total: 0,
    completed: 0,
    questions: [],
  },
]

describe('QuestionList', () => {
  it('groups questions by category and shows per-group completion counts', () => {
    render(
      <QuestionList
        groups={groups}
        selectedId={null}
        onSelect={() => {}}
        selectedIds={new Set()}
        onToggleSelect={() => {}}
        ownerTeams={ownerTeams}
      />,
    )

    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.queryByText('Security')).not.toBeInTheDocument()
  })

  it('shows an indicator only for questions with an empty answer', () => {
    render(
      <QuestionList
        groups={groups}
        selectedId={null}
        onSelect={() => {}}
        selectedIds={new Set()}
        onToggleSelect={() => {}}
        ownerTeams={ownerTeams}
      />,
    )

    const answered = screen.getByText('Describe your company.')
    const unanswered = screen.getByText('What is your SLA?')
    expect(answered.querySelector('span[title]')).toBeNull()
    expect(unanswered.querySelector('span[title]')).not.toBeNull()
  })

  it('calls onSelect when a question row is clicked', async () => {
    const onSelect = vi.fn()
    render(
      <QuestionList
        groups={groups}
        selectedId={null}
        onSelect={onSelect}
        selectedIds={new Set()}
        onToggleSelect={() => {}}
        ownerTeams={ownerTeams}
      />,
    )

    await userEvent.click(screen.getByText('Describe your company.'))
    expect(onSelect).toHaveBeenCalledWith('q-1')
  })
})
