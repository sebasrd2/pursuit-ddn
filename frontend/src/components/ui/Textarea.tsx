import { type TextareaHTMLAttributes, useId } from 'react'
import styles from './Field.module.css'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hideLabel?: boolean
  hint?: string
}

export function Textarea({ label, hideLabel, hint, id, className, ...props }: TextareaProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <div className={styles.field}>
      <label htmlFor={fieldId} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      <textarea id={fieldId} className={[styles.textarea, className].filter(Boolean).join(' ')} {...props} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
