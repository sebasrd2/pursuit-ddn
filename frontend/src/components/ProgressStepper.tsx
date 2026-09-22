import { STAGES } from '../api/types'
import styles from './ProgressStepper.module.css'

interface ProgressStepperProps {
  currentStage: number
}

export function ProgressStepper({ currentStage }: ProgressStepperProps) {
  return (
    <ol className={styles.stepper} aria-label="RFP progress">
      {STAGES.map(({ stage, name }) => {
        const state = stage < currentStage ? 'done' : stage === currentStage ? 'current' : 'upcoming'
        return (
          <li
            key={stage}
            className={[styles.step, styles[state]].join(' ')}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className={styles.marker}>{state === 'done' ? <CheckIcon /> : stage}</span>
            <span className={styles.name}>{name}</span>
          </li>
        )
      })}
    </ol>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
