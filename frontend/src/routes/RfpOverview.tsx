import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ProgressStepper } from '../components/ProgressStepper'
import { ScopingResultView } from '../components/ScopingResultView'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Pill } from '../components/ui/Pill'
import { exportRfp } from '../api/rfps'
import type { RfpStatus } from '../api/types'
import { formatDate, RFP_STATUS_LABEL, RFP_STATUS_TONE } from '../lib/labels'
import { useRfp, useScopingResult, useStartAnswering, useStartScoping, useUpdateRfp } from '../queries/rfps'
import { useQuestions } from '../queries/questions'
import styles from './RfpOverview.module.css'

const STATUS_OPTIONS: Array<{ value: RfpStatus; label: string }> = (
  Object.keys(RFP_STATUS_LABEL) as RfpStatus[]
).map((value) => ({ value, label: RFP_STATUS_LABEL[value] }))

export function RfpOverview() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: rfp, isLoading, isError } = useRfp(id)
  const { data: scopingResult } = useScopingResult(id)
  const { data: categoryGroups = [] } = useQuestions(id, {})
  const updateRfp = useUpdateRfp(id)
  const startScoping = useStartScoping(id)
  const startAnswering = useStartAnswering(id)

  const [rationale, setRationale] = useState('')
  const [onlyApproved, setOnlyApproved] = useState(false)
  const [includeExtraColumns, setIncludeExtraColumns] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [categoriesExpanded, setCategoriesExpanded] = useState(false)
  // null = no manual override yet; defaults to collapsed once a decision has been made,
  // expanded while still deciding (spec §3.3.5: criteria and thresholds shown alongside
  // the result — but once acted on, the detail doesn't need to stay in front by default).
  const [scopingDetailsOverride, setScopingDetailsOverride] = useState<boolean | null>(null)

  if (isError) {
    return <p>Couldn't load this RFP. It may have been deleted.</p>
  }

  if (isLoading || !rfp) {
    return <p>Loading…</p>
  }

  async function handleDecision(decision: 'bid' | 'no_bid') {
    await updateRfp.mutateAsync({ decision, decisionRationale: rationale || null })
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      const blob = await exportRfp(id, { onlyApproved, includeExtraColumns })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = rfp!.sourceFileName ?? `${rfp!.name}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const counts = rfp.questionCounts
  const showScopingDetails = scopingDetailsOverride ?? !rfp.decision

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{rfp.name}</h1>
          <p className={styles.customer}>
            {rfp.customer} · Due {formatDate(rfp.dueDate)}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Select
            label="Status"
            value={rfp.status}
            onValueChange={(status) => updateRfp.mutate({ status: status as RfpStatus })}
            options={STATUS_OPTIONS}
          />
          {rfp.decision === 'bid' && (
            <Button variant="primary" onClick={() => navigate(`/rfps/${id}/questions`)}>
              Open questions workspace
            </Button>
          )}
        </div>
      </div>

      <Card className={styles.stepperCard}>
        <ProgressStepper currentStage={rfp.currentStage} />
      </Card>

      <div className={styles.grid}>
        <div>
          <Card className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Scoping</h2>
              <div className={styles.sectionHeaderActions}>
                {scopingResult && (
                  <Button
                    variant="ghost"
                    onClick={() => setScopingDetailsOverride(!showScopingDetails)}
                  >
                    {showScopingDetails ? 'Hide details' : 'Show details'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => startScoping.mutate()}
                  disabled={startScoping.isPending || rfp.status === 'no_bid'}
                >
                  {startScoping.isPending ? 'Scoping…' : scopingResult ? 'Re-run scoping' : 'Start scoping'}
                </Button>
              </div>
            </div>
            {scopingResult ? (
              <ScopingResultView result={scopingResult} showDetails={showScopingDetails} />
            ) : (
              <p className={styles.emptyState}>
                No scoping result yet. Run scoping to get a bid/no-bid recommendation against the
                configured criteria.
              </p>
            )}
          </Card>

          {rfp.decision === 'bid' && (
            <Card className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Auto-answer</h2>
              </div>
              <div className={styles.statusBreakdown}>
                <span>{counts.unanswered} unanswered</span>
                <span>{counts.aiAnswered} to check</span>
                <span>{counts.needsInput} needs input</span>
                <span>{counts.inReview} in review</span>
                <span>{counts.approved} approved</span>
                <span>{counts.notApplicable} not applicable</span>
              </div>
              <Button
                variant="primary"
                onClick={() => startAnswering.mutate()}
                disabled={startAnswering.isPending || counts.unanswered === 0}
              >
                {startAnswering.isPending ? 'Answering…' : 'Answer all'}
              </Button>
            </Card>
          )}

          {rfp.decision === 'bid' && (
            <Card className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Export</h2>
              </div>
              <div className={styles.exportRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={onlyApproved}
                    onChange={(e) => setOnlyApproved(e.target.checked)}
                  />
                  Only approved questions
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeExtraColumns}
                    onChange={(e) => setIncludeExtraColumns(e.target.checked)}
                  />
                  Append Owner, Status, Citation columns
                </label>
                <Button variant="primary" onClick={handleExport} disabled={isExporting}>
                  {isExporting ? 'Exporting…' : 'Download .xlsx'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card className={styles.section}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>
              Summary
            </h2>
            <div className={styles.meta}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Status</span>
                <Pill tone={RFP_STATUS_TONE[rfp.status]}>{RFP_STATUS_LABEL[rfp.status]}</Pill>
              </div>
              <div>
                <button
                  type="button"
                  className={styles.categoriesToggle}
                  onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                  disabled={categoryGroups.length === 0}
                  aria-expanded={categoriesExpanded}
                >
                  <span className={styles.metaLabel}>Categories</span>
                  <span>
                    {rfp.categoryCount} {categoryGroups.length > 0 && (categoriesExpanded ? '▾' : '▸')}
                  </span>
                </button>
                {categoriesExpanded && (
                  <ul className={styles.categoryList}>
                    {categoryGroups.map((group) => (
                      <li key={group.categoryId}>
                        <span>{group.categoryName}</span>
                        <span className={styles.metaLabel}>
                          {group.completed}/{group.total}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Questions</span>
                <span>{counts.total}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Approved</span>
                <span>{counts.approved}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Needs input</span>
                <span>{counts.needsInput}</span>
              </div>
              {rfp.notes && (
                <div>
                  <span className={styles.metaLabel}>Notes</span>
                  <p style={{ marginTop: 4 }}>{rfp.notes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className={styles.section}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>
              Decision
            </h2>
            {rfp.decision ? (
              <>
                <Pill tone={rfp.decision === 'bid' ? 'success' : 'danger'} style={{ marginBottom: 12 }}>
                  {rfp.decision === 'bid' ? 'Bid' : 'No-bid'}
                </Pill>
                {rfp.decisionRationale && <p className={styles.emptyState}>{rfp.decisionRationale}</p>}
              </>
            ) : (
              <>
                <Textarea
                  label="Rationale (optional)"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Why this decision?"
                  style={{ marginBottom: 16 }}
                />
                <div className={styles.decisionButtons}>
                  <Button variant="primary" onClick={() => handleDecision('bid')} disabled={updateRfp.isPending}>
                    Bid
                  </Button>
                  <Button variant="danger" onClick={() => handleDecision('no_bid')} disabled={updateRfp.isPending}>
                    No-bid
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
