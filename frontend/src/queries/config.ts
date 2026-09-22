import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/config'
import { queryKeys } from './keys'

export function useOwnerTeams() {
  return useQuery({ queryKey: queryKeys.ownerTeams, queryFn: api.listOwnerTeams })
}

export function useCreateOwnerTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createOwnerTeam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ownerTeams }),
  })
}

export function useUpdateOwnerTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: api.UpdateOwnerTeamInput }) =>
      api.updateOwnerTeam(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ownerTeams }),
  })
}

export function useDeleteOwnerTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteOwnerTeam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ownerTeams }),
  })
}

export function useBidCriteria() {
  return useQuery({ queryKey: queryKeys.bidCriteria, queryFn: api.listBidCriteria })
}

export function useUpdateBidCriterion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: api.UpdateBidCriterionInput }) =>
      api.updateBidCriterion(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.bidCriteria }),
  })
}

export function useScopingSettings() {
  return useQuery({ queryKey: queryKeys.scopingSettings, queryFn: api.getScopingSettings })
}

export function useUpdateScopingSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.updateScopingSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.scopingSettings }),
  })
}

export function useHealth() {
  return useQuery({ queryKey: queryKeys.health, queryFn: api.getHealth })
}
