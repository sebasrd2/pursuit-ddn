import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Rfp, RfpStatus } from '../api/types'
import { KpiTile } from '../components/KpiTile'
import { StageBar } from '../components/StageBar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import { TextField } from '../components/ui/TextField'
import { daysUntil, formatDate, RFP_STATUS_LABEL, RFP_STATUS_TONE } from '../lib/labels'
import { computeRfpStats, DUE_SOON_DAYS } from '../lib/rfpStats'
import { useRfps } from '../queries/rfps'
import styles from './RfpList.module.css'

type StatusFilter = RfpStatus | 'all'

export function RfpList() {
  const navigate = useNavigate()
  const { data: rfps, isLoading } = useRfps()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const today = new Date()

  return (
    <div>
      <div className={styles.header}>
        <div>
          <p className={styles.today}>
            {today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className={styles.title}>RFPs</h1>
        </div>
        <Button variant="primary" onClick={() => navigate('/rfps/new')}>
          New RFP
        </Button>
      </div>

      {isLoading ? (
        <Card className={styles.empty}>Loading…</Card>
      ) : !rfps || rfps.length === 0 ? (
        <Card className={styles.empty}>No RFPs yet. Create one to get started.</Card>
      ) : (
        <>
          <Kpis rfps={rfps} today={today} />
          <div className={styles.toolbar}>
            <StatusTabs rfps={rfps} value={statusFilter} onChange={setStatusFilter} />
            <div className={styles.search}>
              <TextField
                label="Search RFPs or customers"
                hideLabel
                placeholder="Search RFPs or customers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <RfpTable rfps={filterRfps(rfps, statusFilter, search)} today={today} />
        </>
      )}
    </div>
  )
}

function Kpis({ rfps, today }: { rfps: Rfp[]; today: Date }) {
  const stats = computeRfpStats(rfps, today)
  const { nextDue, nextAwaiting } = stats
  return (
    <Card className={styles.kpis}>
      <KpiTile label="Open pursuits" value={stats.open} detail={`${stats.completeThisMonth} complete this month`} />
      <KpiTile
        label={`Due in ${DUE_SOON_DAYS} days`}
        value={stats.dueSoon}
        detail={nextDue ? `Next: ${formatDate(nextDue.dueDate)} · ${dueLabel(daysUntil(nextDue.dueDate, today)!)}` : 'Nothing due soon'}
      />
      <KpiTile
        label="Bid rate"
        value={stats.decided ? `${Math.round((stats.bids / stats.decided) * 100)}%` : '—'}
        detail={stats.decided ? `${stats.bids} of ${stats.decided} decided to bid` : 'No decisions yet'}
      />
      <KpiTile
        label="Awaiting decision"
        value={stats.awaitingDecision}
        detail={nextAwaiting ? `${nextAwaiting.name} · ${nextAwaiting.customer}` : 'All decided'}
      />
    </Card>
  )
}

interface StatusTabsProps {
  rfps: Rfp[]
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}

/** "All" plus one tab per status currently in use, each with its count. */
function StatusTabs({ rfps, value, onChange }: StatusTabsProps) {
  const statuses = (Object.keys(RFP_STATUS_LABEL) as RfpStatus[]).filter((status) =>
    rfps.some((rfp) => rfp.status === status),
  )
  const tabs = [
    { value: 'all' as const, label: 'All', count: rfps.length },
    ...statuses.map((status) => ({
      value: status,
      label: RFP_STATUS_LABEL[status],
      count: rfps.filter((rfp) => rfp.status === status).length,
    })),
  ]
  return (
    <div className={styles.tabs} role="group" aria-label="Filter by status">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={value === tab.value}
          className={styles.tab}
          onClick={() => onChange(tab.value)}
        >
          {tab.label} <span className={styles.tabCount}>{tab.count}</span>
        </button>
      ))}
    </div>
  )
}

function RfpTable({ rfps, today }: { rfps: Rfp[]; today: Date }) {
  const navigate = useNavigate()
  if (rfps.length === 0) {
    return <Card className={styles.empty}>No RFPs match this filter.</Card>
  }
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Customer</th>
            <th>Due</th>
            <th>Status</th>
            <th>Stage</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {rfps.map((rfp) => (
            <tr key={rfp.id} className={styles.row} onClick={() => navigate(`/rfps/${rfp.id}`)}>
              <td>
                <span className={styles.name}>{rfp.name}</span>
              </td>
              <td>{rfp.customer}</td>
              <td>
                <DueCell rfp={rfp} today={today} />
              </td>
              <td>
                <Pill tone={RFP_STATUS_TONE[rfp.status]}>{RFP_STATUS_LABEL[rfp.status]}</Pill>
              </td>
              <td>
                <StageBar currentStage={rfp.currentStage} currentStageName={rfp.currentStageName} />
              </td>
              <td>
                <DecisionCell rfp={rfp} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

/** Due date plus time left; only open RFPs get a countdown, overdue ones in red. */
function DueCell({ rfp, today }: { rfp: Rfp; today: Date }) {
  const days = daysUntil(rfp.dueDate, today)
  const isOpen = rfp.status !== 'complete' && rfp.status !== 'no_bid'
  return (
    <div className={styles.due}>
      <span>{formatDate(rfp.dueDate)}</span>
      {isOpen && days !== null && (
        <span className={days < 0 ? styles.overdue : styles.muted}>{dueLabel(days)}</span>
      )}
    </div>
  )
}

function DecisionCell({ rfp }: { rfp: Rfp }) {
  if (rfp.decision) {
    return (
      <Pill tone={rfp.decision === 'bid' ? 'success' : 'danger'}>{rfp.decision === 'bid' ? 'Bid' : 'No-bid'}</Pill>
    )
  }
  if (rfp.status === 'no_bid') return <span className={styles.muted}>—</span>
  return (
    <Link to={`/rfps/${rfp.id}`} className={styles.decide} onClick={(e) => e.stopPropagation()}>
      Decide →
    </Link>
  )
}

function dueLabel(days: number): string {
  if (days < 0) return `${-days} ${-days === 1 ? 'day' : 'days'} overdue`
  if (days === 0) return 'Today'
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

function filterRfps(rfps: Rfp[], status: StatusFilter, search: string): Rfp[] {
  const query = search.trim().toLowerCase()
  return rfps.filter(
    (rfp) =>
      (status === 'all' || rfp.status === status) &&
      (rfp.name.toLowerCase().includes(query) || rfp.customer.toLowerCase().includes(query)),
  )
}
