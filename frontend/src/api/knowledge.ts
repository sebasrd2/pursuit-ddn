import { apiClient } from './client'
import type { KnowledgeDocument, KnowledgePassage } from './types'

export function listKnowledgeDocuments() {
  return apiClient.get<KnowledgeDocument[]>('/knowledge/documents')
}

export function ingestKnowledge() {
  return apiClient.post<KnowledgeDocument[]>('/knowledge/ingest')
}

export function deleteKnowledgeDocument(id: string) {
  return apiClient.delete<void>(`/knowledge/documents/${id}`)
}

export function searchKnowledge(query: string) {
  const params = new URLSearchParams({ q: query })
  return apiClient.get<KnowledgePassage[]>(`/knowledge/search?${params.toString()}`)
}
