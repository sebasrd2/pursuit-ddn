import { type FormEvent, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextField } from '../components/ui/TextField'
import {
  useDeleteKnowledgeDocument,
  useIngestKnowledge,
  useKnowledgeDocuments,
  useKnowledgeSearch,
} from '../queries/knowledge'
import styles from './Knowledge.module.css'

export function Knowledge() {
  const { data: documents = [], isLoading } = useKnowledgeDocuments()
  const ingest = useIngestKnowledge()
  const deleteDocument = useDeleteKnowledgeDocument()

  const [searchInput, setSearchInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const { data: passages = [], isFetching: isSearching } = useKnowledgeSearch(activeQuery, activeQuery.length > 0)

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setActiveQuery(searchInput.trim())
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Knowledge</h1>
        <Button variant="primary" onClick={() => ingest.mutate()} disabled={ingest.isPending}>
          {ingest.isPending ? 'Re-indexing…' : 'Re-index'}
        </Button>
      </div>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Indexed documents</h2>
        {isLoading ? (
          <p className={styles.empty}>Loading…</p>
        ) : documents.length === 0 ? (
          <p className={styles.empty}>No documents indexed yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Passages</th>
                <th>Ingested</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.title}</td>
                  <td>{doc.sourceType}</td>
                  <td>{doc.passageCount}</td>
                  <td>{doc.ingestedAt ? new Date(doc.ingestedAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => deleteDocument.mutate(doc.id)}
                      disabled={deleteDocument.isPending}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Retrieval preview</h2>
        <form className={styles.searchRow} onSubmit={handleSearch}>
          <TextField
            label="Question"
            hideLabel
            placeholder="Paste a question to preview retrieval"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={isSearching}>
            {isSearching ? 'Searching…' : 'Preview'}
          </Button>
        </form>

        {activeQuery && passages.length === 0 && !isSearching && (
          <p className={styles.empty}>No passages matched.</p>
        )}

        {passages.map((passage, index) => (
          <div key={`${passage.documentId}-${index}`} className={styles.passage}>
            <div className={styles.passageHeading}>{passage.heading}</div>
            <div className={styles.passageMeta}>
              {passage.documentTitle} · score {passage.score.toFixed(2)}
            </div>
            <div className={styles.passageText}>{passage.text}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}
