import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ScopingResult } from '../api/types'
import { ScopingResultView } from './ScopingResultView'

const result: ScopingResult = {
  id: 'scope-1',
  rfpId: 'rfp-1',
  threshold: 'balanced',
  thresholdBand: { bid: 65, conditionalLow: 45, conditionalHigh: 64 },
  overallScore: 72,
  recommendation: 'bid',
  disqualifierTriggered: false,
  createdAt: '',
  criteria: [
    {
      criterionId: 'crit-disqualifier',
      name: 'Mandatory disqualifier',
      description: 'Whether the RFP states a requirement DDN cannot meet at all',
      enabled: true,
      importance: null,
      isDisqualifier: true,
      assessment: 'not_triggered',
      points: null,
      evidence: null,
      reasoning: 'No disqualifying requirement was found.',
    },
    {
      criterionId: 'crit-product-fit',
      name: 'Product fit',
      description: "Whether DDN's portfolio addresses the requirements",
      enabled: true,
      importance: 'high',
      isDisqualifier: false,
      assessment: 'strong',
      points: 2,
      evidence: 'Infinia Object Storage — Product Documentation',
      reasoning: 'Direct match to the stated requirements.',
    },
  ],
}

describe('ScopingResultView', () => {
  it('renders the score, recommendation, threshold band and criteria', () => {
    render(<ScopingResultView result={result} />)

    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('Bid')).toBeInTheDocument()
    expect(screen.getByText(/Balanced — bid ≥ 65/)).toBeInTheDocument()
    expect(screen.getByText('Product fit')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(screen.getByText('Infinia Object Storage — Product Documentation')).toBeInTheDocument()
    expect(screen.getByText('Direct match to the stated requirements.')).toBeInTheDocument()
  })

  it('shows the disqualifier state separately from scored criteria', () => {
    render(<ScopingResultView result={result} />)
    expect(screen.getByText(/Disqualifier: Not triggered/)).toBeInTheDocument()
  })
})
