import type { ReactNode } from 'react'
import styles from './KpiTile.module.css'

interface KpiTileProps {
  label: string
  value: ReactNode
  detail: ReactNode
}

/** One headline number on the RFP dashboard, with a label and a supporting line. */
export function KpiTile({ label, value, detail }: KpiTileProps) {
  return (
    <div className={styles.tile}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <span className={styles.detail}>{detail}</span>
    </div>
  )
}
