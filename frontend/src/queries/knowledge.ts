import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/knowledge'
import { queryKeys } from './keys'

export function useKnowledgeDocuments() {
  return useQuery({ queryKey: queryKeys.knowledgeDocuments, queryFn: api.listKnowledgeDocuments })
}

export function useIngestKnowledge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.ingestKnowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeDocuments })
    },
  })
}

export function useDeleteKnowledgeDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteKnowledgeDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeDocuments })
    },
  })
}

export function useKnowledgeSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.knowledgeSearch(query),
    queryFn: () => api.searchKnowledge(query),
    enabled,
  })
}
