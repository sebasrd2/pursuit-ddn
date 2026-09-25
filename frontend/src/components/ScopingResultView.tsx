import type { ScopingResult } from '../api/types'
import { Pill } from './ui/Pill'
import { RECOMMENDATION_LABEL, RECOMMENDATION_TONE } from '../lib/labels'
import styles from './ScopingResultView.module.css'

const ASSESSMENT_LABEL: Record<string, string> = {
  strong: 'Strong',
  partial: 'Partial',
  weak: 'Weak',
  not_assessed: 'Not assessed',
  triggered: 'Triggered',
  not_triggered: 'Not triggered',
}

const IMPORTANCE_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' }
const THRESHOLD_LABEL: Record<string, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
}

interface ScopingResultViewProps {
  result: ScopingResult
  /** Whether the disqualifier callout and per-criterion table are shown. Defaults to true. */
  showDetails?: boolean
}

export function ScopingResultView({ result, showDetails = true }: ScopingResultViewProps) {
  const disqualifier = result.criteria.find((c) => c.isDisqualifier)
  const scored = result.criteria.filter((c) => !c.isDisqualifier)

  return (
    <div>
      <div className={styles.summary}>
        <div>
          <span className={styles.scoreLabel}>Overall score</span>
          <div className={styles.score}>{result.overallScore ?? '—'}</div>
        </div>
        <div>
          <span className={styles.scoreLabel}>Recommendation</span>
          <div>
            <Pill tone={RECOMMENDATION_TONE[result.recommendation]}>
              {RECOMMENDATION_LABEL[result.recommendation]}
            </Pill>
          </div>
        </div>
        <div>
          <span className={styles.scoreLabel}>Threshold in force</span>
          <div className={styles.thresholdText}>
            {THRESHOLD_LABEL[result.threshold]} — bid ≥ {result.thresholdBand.bid}, conditional{' '}
            {result.thresholdBand.conditionalLow}–{result.thresholdBand.conditionalHigh}, otherwise no-bid
          </div>
        </div>
      </div>

      {showDetails && (
        <>
          {disqualifier && (
            <div className={styles.disqualifier}>
              <Pill tone={disqualifier.assessment === 'triggered' ? 'danger' : 'success'}>
                Disqualifier: {ASSESSMENT_LABEL[disqualifier.assessment]}
              </Pill>
              <p className={styles.reasoning}>{disqualifier.reasoning}</p>
            </div>
          )}

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Importance</th>
                <th>Assessment</th>
                <th>Evidence &amp; reasoning</th>
              </tr>
            </thead>
            <tbody>
              {scored.map((criterion) => (
                <tr key={criterion.criterionId}>
                  <td>
                    <div className={styles.criterionName}>{criterion.name}</div>
                    <div className={styles.criterionDescription}>{criterion.description}</div>
                    {!criterion.enabled && <Pill tone="neutral">Disabled</Pill>}
                  </td>
                  <td>{criterion.importance ? IMPORTANCE_LABEL[criterion.importance] : '—'}</td>
                  <td>
                    <Pill
                      tone={
                        criterion.assessment === 'strong'
                          ? 'success'
                          : criterion.assessment === 'partial'
                            ? 'warning'
                            : criterion.assessment === 'weak'
                              ? 'danger'
                              : 'neutral'
                      }
                    >
                      {ASSESSMENT_LABEL[criterion.assessment]}
                    </Pill>
                  </td>
                  <td>
                    {criterion.evidence && <div className={styles.evidence}>{criterion.evidence}</div>}
                    <div className={styles.reasoning}>{criterion.reasoning}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
