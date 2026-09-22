import { apiClient } from './client'
import type { BidCriterion, HealthInfo, Importance, OwnerTeam, ScopingSettings, Threshold } from './types'

export function listOwnerTeams() {
  return apiClient.get<OwnerTeam[]>('/owner-teams')
}

export interface CreateOwnerTeamInput {
  name: string
}

export function createOwnerTeam(input: CreateOwnerTeamInput) {
  return apiClient.post<OwnerTeam>('/owner-teams', input)
}

export interface UpdateOwnerTeamInput {
  name?: string
  active?: boolean
  displayOrder?: number
}

export function updateOwnerTeam(id: string, input: UpdateOwnerTeamInput) {
  return apiClient.patch<OwnerTeam>(`/owner-teams/${id}`, input)
}

export function deleteOwnerTeam(id: string) {
  return apiClient.delete<void>(`/owner-teams/${id}`)
}

export function listBidCriteria() {
  return apiClient.get<BidCriterion[]>('/bid-criteria')
}

export interface UpdateBidCriterionInput {
  enabled?: boolean
  importance?: Importance
}

export function updateBidCriterion(id: string, input: UpdateBidCriterionInput) {
  return apiClient.patch<BidCriterion>(`/bid-criteria/${id}`, input)
}

export function getScopingSettings() {
  return apiClient.get<ScopingSettings>('/scoping-settings')
}

export function updateScopingSettings(threshold: Threshold) {
  return apiClient.patch<ScopingSettings>('/scoping-settings', { threshold })
}

export function getHealth() {
  return apiClient.get<HealthInfo>('/health')
}
