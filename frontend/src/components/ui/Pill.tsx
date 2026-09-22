import type { HTMLAttributes } from 'react'
import styles from './Pill.module.css'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'ink'

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Pill({ tone = 'neutral', className, ...props }: PillProps) {
  const classes = [styles.pill, styles[tone], className].filter(Boolean).join(' ')
  return <span className={classes} {...props} />
}
