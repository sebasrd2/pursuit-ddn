export const queryKeys = {
  rfps: ['rfps'] as const,
  rfp: (id: string) => ['rfps', id] as const,
  scopingResult: (id: string) => ['rfps', id, 'scope'] as const,
  questions: (id: string, filters: Record<string, string | undefined>) =>
    ['rfps', id, 'questions', filters] as const,
  knowledgeDocuments: ['knowledge', 'documents'] as const,
  knowledgeSearch: (query: string) => ['knowledge', 'search', query] as const,
  ownerTeams: ['owner-teams'] as const,
  bidCriteria: ['bid-criteria'] as const,
  scopingSettings: ['scoping-settings'] as const,
  health: ['health'] as const,
}
