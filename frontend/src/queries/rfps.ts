import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/rfps'
import { queryKeys } from './keys'

export function useRfps() {
  return useQuery({ queryKey: queryKeys.rfps, queryFn: api.listRfps })
}

export function useRfp(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.rfp(id ?? ''),
    queryFn: () => api.getRfp(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateRfp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createRfp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rfps })
    },
  })
}

export function useUpdateRfp(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.UpdateRfpInput) => api.updateRfp(id, input),
    onSuccess: (rfp) => {
      queryClient.setQueryData(queryKeys.rfp(id), rfp)
      queryClient.invalidateQueries({ queryKey: queryKeys.rfps })
    },
  })
}

export function useDeleteRfp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteRfp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rfps })
    },
  })
}

export function useScopingResult(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.scopingResult(id ?? ''),
    queryFn: () => api.getScopingResult(id as string),
    enabled: Boolean(id),
  })
}

export function useStartScoping(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.startScoping(id),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.scopingResult(id), result)
      queryClient.invalidateQueries({ queryKey: queryKeys.rfp(id) })
    },
  })
}

export function useStartAnswering(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.startAnswering(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rfp(id) })
      queryClient.invalidateQueries({ queryKey: ['rfps', id, 'questions'] })
    },
  })
}
