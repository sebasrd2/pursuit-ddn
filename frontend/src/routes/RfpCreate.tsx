import { type FormEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextField } from '../components/ui/TextField'
import { Textarea } from '../components/ui/Textarea'
import { useCreateRfp } from '../queries/rfps'
import styles from './RfpCreate.module.css'

export function RfpCreate() {
  const navigate = useNavigate()
  const createRfp = useCreateRfp()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [customer, setCustomer] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!file) {
      setError('Upload the question spreadsheet (.xlsx) to continue.')
      return
    }

    try {
      const summary = await createRfp.mutateAsync({
        name,
        customer,
        dueDate: dueDate || null,
        notes: notes || null,
        file,
      })
      navigate(`/rfps/${summary.rfp.id}`)
    } catch {
      setError('Something went wrong creating the RFP. Please try again.')
    }
  }

  return (
    <div>
      <h1 className={styles.title}>New RFP</h1>
      <Card>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <TextField
              label="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Object Storage Platform RFP"
            />
            <TextField
              label="Customer"
              required
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="e.g. Helios Data"
            />
          </div>

          <TextField
            label="Due date"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context for this opportunity"
          />

          <div>
            <span className={styles.label}>Question spreadsheet (.xlsx)</span>
            <div
              className={styles.dropzone}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
            >
              {file ? <span className={styles.fileName}>{file.name}</span> : 'Click to choose a file, or drag one here'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="visually-hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && <span className={styles.error}>{error}</span>}

          <div className={styles.actions}>
            <Button type="submit" variant="primary" disabled={createRfp.isPending}>
              {createRfp.isPending ? 'Importing…' : 'Create and import'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
