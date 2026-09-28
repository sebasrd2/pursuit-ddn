import { STAGES } from '../api/types'
import styles from './StageBar.module.css'

interface StageBarProps {
  currentStage: number
  currentStageName: string
}

/** Compact stage progress: one segment per stage, filled up to the current one. */
export function StageBar({ currentStage, currentStageName }: StageBarProps) {
  return (
    <div className={styles.stageBar}>
      <div
        className={styles.segments}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STAGES.length}
        aria-valuenow={currentStage}
        aria-label="Stage"
      >
        {STAGES.map(({ stage }) => (
          <span key={stage} className={stage <= currentStage ? styles.done : styles.todo} />
        ))}
      </div>
      <span className={styles.label}>
        {currentStage} · {currentStageName}
      </span>
    </div>
  )
}
