import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedSave } from './useDebouncedSave'

describe('useDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves the edited value after the debounce delay', () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useDebouncedSave('original', onSave))

    act(() => result.current[1]('edited'))
    expect(onSave).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(600))
    expect(onSave).toHaveBeenCalledWith('edited')
  })

  it('flushes a pending edit instead of discarding it when the underlying value changes first', () => {
    const onSave = vi.fn()
    const { result, rerender } = renderHook(
      ({ initialValue }) => useDebouncedSave(initialValue, onSave),
      { initialProps: { initialValue: 'question A text' } },
    )

    act(() => result.current[1]('A edited, not yet saved'))

    // The user switches to a different question before the 600ms debounce fires.
    rerender({ initialValue: 'question B text' })

    expect(onSave).toHaveBeenCalledWith('A edited, not yet saved')
    expect(result.current[0]).toBe('question B text')

    // The now-cancelled timeout for A must not fire again or overwrite anything.
    act(() => vi.advanceTimersByTime(600))
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
