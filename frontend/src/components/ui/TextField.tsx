import { type InputHTMLAttributes, useId } from 'react'
import styles from './Field.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hideLabel?: boolean
  hint?: string
}

export function TextField({ label, hideLabel, hint, id, className, ...props }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <div className={styles.field}>
      <label htmlFor={fieldId} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      <input id={fieldId} className={[styles.input, className].filter(Boolean).join(' ')} {...props} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
