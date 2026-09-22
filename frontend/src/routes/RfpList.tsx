import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import { formatDate, RFP_STATUS_LABEL, RFP_STATUS_TONE } from '../lib/labels'
import { useRfps } from '../queries/rfps'
import styles from './RfpList.module.css'

export function RfpList() {
  const navigate = useNavigate()
  const { data: rfps, isLoading } = useRfps()

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>RFPs</h1>
        <Button variant="primary" onClick={() => navigate('/rfps/new')}>
          New RFP
        </Button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className={styles.empty}>Loading…</div>
        ) : !rfps || rfps.length === 0 ? (
          <div className={styles.empty}>No RFPs yet. Create one to get started.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Customer</th>
                <th>Due date</th>
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
                  <td>{formatDate(rfp.dueDate)}</td>
                  <td>
                    <Pill tone={RFP_STATUS_TONE[rfp.status]}>{RFP_STATUS_LABEL[rfp.status]}</Pill>
                  </td>
                  <td className={styles.stage}>
                    {rfp.currentStage}. {rfp.currentStageName}
                  </td>
                  <td>
                    {rfp.decision ? (
                      <Pill tone={rfp.decision === 'bid' ? 'success' : 'danger'}>
                        {rfp.decision === 'bid' ? 'Bid' : 'No-bid'}
                      </Pill>
                    ) : (
                      <span className={styles.stage}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
