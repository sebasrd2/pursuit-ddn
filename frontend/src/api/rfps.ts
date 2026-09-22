import { apiClient } from './client'
import type { BidDecision, Rfp, RfpStatus, ScopingResult } from './types'

export interface CreateRfpInput {
  name: string
  customer: string
  dueDate: string | null
  notes: string | null
  file: File
}

export interface UpdateRfpInput {
  name?: string
  customer?: string
  dueDate?: string | null
  notes?: string | null
  status?: RfpStatus
  decision?: BidDecision
  decisionRationale?: string | null
}

export interface ImportSummary {
  rfp: Rfp
  questionCount: number
  categoryCount: number
}

export function listRfps() {
  return apiClient.get<Rfp[]>('/rfps')
}

export function getRfp(id: string) {
  return apiClient.get<Rfp>(`/rfps/${id}`)
}

export function createRfp(input: CreateRfpInput) {
  const form = new FormData()
  form.set('name', input.name)
  form.set('customer', input.customer)
  if (input.dueDate) form.set('dueDate', input.dueDate)
  if (input.notes) form.set('notes', input.notes)
  form.set('file', input.file)
  return apiClient.postForm<ImportSummary>('/rfps', form)
}

export function updateRfp(id: string, input: UpdateRfpInput) {
  return apiClient.patch<Rfp>(`/rfps/${id}`, input)
}

export function deleteRfp(id: string) {
  return apiClient.delete<void>(`/rfps/${id}`)
}

export function startScoping(id: string) {
  return apiClient.post<ScopingResult>(`/rfps/${id}/scope`)
}

export function getScopingResult(id: string) {
  return apiClient.get<ScopingResult | null>(`/rfps/${id}/scope`)
}

export function startAnswering(id: string) {
  return apiClient.post<Rfp>(`/rfps/${id}/answer`)
}

export interface ExportOptions {
  onlyApproved: boolean
  includeExtraColumns: boolean
}

export async function exportRfp(id: string, options: ExportOptions): Promise<Blob> {
  const params = new URLSearchParams({
    onlyApproved: String(options.onlyApproved),
    includeExtraColumns: String(options.includeExtraColumns),
  })
  const response = await fetch(`/api/rfps/${id}/export?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`)
  }
  return response.blob()
}
