import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import { Settings } from './Settings'

describe('Settings', () => {
  it('changing the threshold dropdown submits the new value', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Settings />)

    const thresholdTrigger = await screen.findByRole('combobox', { name: 'Threshold' })
    expect(thresholdTrigger).toHaveTextContent('Balanced')

    await user.click(thresholdTrigger)
    await user.click(await screen.findByRole('option', { name: 'Aggressive' }))

    await waitFor(() => expect(thresholdTrigger).toHaveTextContent('Aggressive'))
  })

  it('changing a criterion importance dropdown submits the new value', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Settings />)

    await screen.findByText('Product fit')
    const row = screen.getByText('Product fit').closest('tr')!
    const importanceTrigger = within(row).getByRole('combobox', { name: 'Product fit importance' })
    expect(importanceTrigger).toHaveTextContent('High')

    await user.click(importanceTrigger)
    await user.click(await screen.findByRole('option', { name: 'Low' }))

    await waitFor(() => expect(importanceTrigger).toHaveTextContent('Low'))
  })

  it('disabling a criterion submits enabled: false', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Settings />)

    await screen.findByText('Requirements coverage')
    const row = screen.getByText('Requirements coverage').closest('tr')!
    const enabledTrigger = within(row).getByRole('combobox', { name: 'Requirements coverage enabled' })
    expect(enabledTrigger).toHaveTextContent('Yes')

    await user.click(enabledTrigger)
    await user.click(await screen.findByRole('option', { name: 'No' }))

    await waitFor(() => expect(enabledTrigger).toHaveTextContent('No'))
  })
})
