import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/questions'
import { queryKeys } from './keys'

function invalidateRfpQuestions(
  queryClient: ReturnType<typeof useQueryClient>,
  rfpId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['rfps', rfpId, 'questions'] })
  queryClient.invalidateQueries({ queryKey: queryKeys.rfp(rfpId) })
}

export function useQuestions(rfpId: string, filters: api.QuestionFilters) {
  return useQuery({
    queryKey: queryKeys.questions(rfpId, filters as Record<string, string | undefined>),
    queryFn: () => api.listQuestions(rfpId, filters),
    enabled: Boolean(rfpId),
  })
}

export function useCreateQuestion(rfpId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateQuestionInput) => api.createQuestion(rfpId, input),
    onSuccess: () => invalidateRfpQuestions(queryClient, rfpId),
  })
}

export function useUpdateQuestion(rfpId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: api.UpdateQuestionInput }) =>
      api.updateQuestion(id, input),
    onSuccess: () => invalidateRfpQuestions(queryClient, rfpId),
  })
}

export function useBulkUpdateQuestions(rfpId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.bulkUpdateQuestions,
    onSuccess: () => invalidateRfpQuestions(queryClient, rfpId),
  })
}

export function useDeleteQuestion(rfpId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteQuestion,
    onSuccess: () => invalidateRfpQuestions(queryClient, rfpId),
  })
}

export function useAnswerQuestion(rfpId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, instruction }: { id: string; instruction?: string }) =>
      api.answerQuestion(id, instruction),
    onSuccess: () => invalidateRfpQuestions(queryClient, rfpId),
  })
}
