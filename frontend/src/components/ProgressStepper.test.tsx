import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressStepper } from './ProgressStepper'

describe('ProgressStepper', () => {
  it('marks earlier stages done and the matching stage current', () => {
    render(<ProgressStepper currentStage={3} />)

    expect(screen.getByText('Import').closest('li')).toHaveAttribute('class', expect.stringContaining('done'))
    expect(screen.getByText('Scoping').closest('li')).toHaveAttribute('class', expect.stringContaining('done'))
    expect(screen.getByText('Decision').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Auto-answer').closest('li')).not.toHaveAttribute('aria-current')
  })

  it('marks every stage upcoming when at stage 1', () => {
    render(<ProgressStepper currentStage={1} />)
    expect(screen.getByText('Import').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Export').closest('li')).toHaveAttribute('class', expect.stringContaining('upcoming'))
  })

  it('marks every stage done when past the last one', () => {
    render(<ProgressStepper currentStage={6} />)
    expect(screen.getByText('Review').closest('li')).toHaveAttribute('class', expect.stringContaining('done'))
    expect(screen.getByText('Export').closest('li')).toHaveAttribute('aria-current', 'step')
  })
})
