import { apiClient } from './client'
import type { Question, QuestionStatus } from './types'

export interface QuestionFilters {
  status?: QuestionStatus
  ownerTeamId?: string
  categoryId?: string
  search?: string
}

export interface CategoryGroup {
  categoryId: string
  categoryName: string
  displayOrder: number
  questions: Question[]
  completed: number
  total: number
}

export function listQuestions(rfpId: string, filters: QuestionFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.ownerTeamId) params.set('ownerTeamId', filters.ownerTeamId)
  if (filters.categoryId) params.set('categoryId', filters.categoryId)
  if (filters.search) params.set('search', filters.search)
  const query = params.toString()
  return apiClient.get<CategoryGroup[]>(`/rfps/${rfpId}/questions${query ? `?${query}` : ''}`)
}

export interface CreateQuestionInput {
  categoryName: string
  questionText: string
  answerText?: string
}

export function createQuestion(rfpId: string, input: CreateQuestionInput) {
  return apiClient.post<Question>(`/rfps/${rfpId}/questions`, input)
}

export interface UpdateQuestionInput {
  questionText?: string
  answerText?: string
  citation?: string | null
  status?: QuestionStatus
  ownerTeamId?: string
  ownerName?: string | null
  notes?: string | null
}

export function updateQuestion(id: string, input: UpdateQuestionInput) {
  return apiClient.patch<Question>(`/questions/${id}`, input)
}

export interface BulkUpdateInput {
  questionIds: string[]
  ownerTeamId?: string
  status?: QuestionStatus
}

export function bulkUpdateQuestions(input: BulkUpdateInput) {
  return apiClient.patch<Question[]>('/questions/bulk', input)
}

export function deleteQuestion(id: string) {
  return apiClient.delete<void>(`/questions/${id}`)
}

export function answerQuestion(id: string, instruction?: string) {
  return apiClient.post<Question>(`/questions/${id}/answer`, instruction ? { instruction } : {})
}
