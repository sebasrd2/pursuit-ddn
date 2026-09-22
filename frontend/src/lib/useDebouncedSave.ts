import { useEffect, useRef, useState } from 'react'

/** Tracks a local edit and commits it via `onSave` `delayMs` after the last change. */
export function useDebouncedSave(initialValue: string, onSave: (value: string) => void, delayMs = 600) {
  const [value, setValue] = useState(initialValue)
  const isFirstRun = useRef(true)
  const previousInitial = useRef(initialValue)

  useEffect(() => {
    if (initialValue !== previousInitial.current) {
      if (value !== previousInitial.current) {
        // An edit was pending when the underlying value changed (e.g. the user
        // switched questions before the debounce fired) — flush it now instead
        // of silently discarding it.
        onSave(value)
      }
      previousInitial.current = initialValue
      setValue(initialValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue])

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (value === previousInitial.current) return

    const timeout = setTimeout(() => {
      previousInitial.current = value
      onSave(value)
    }, delayMs)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return [value, setValue] as const
}
