export type PublicationStatus =
  | 'draft'
  | 'reviewed'
  | 'published'
  | 'withdrawn'

export type CourtLevel = 'supreme-court' | 'high-court' | 'other'

export interface JudgmentIndexRecord {
  id: string
  caseName: string
  court: string
  courtLevel: CourtLevel
  date: string
  year: number
  citation: string
  citationNormalized: string
  topics: string[]
  sections: string[]
  keywords: string[]
  shortSummary: string
  sourceReference: string
  sourceUrl?: string
  documentAvailable: boolean
  analysisAvailable: boolean
  status: PublicationStatus
  checksum?: string
}

export interface JudgmentReasoningBlock {
  heading: string
  explanation: string
}

export interface JudgmentProvisionRef {
  actName?: string
  article?: string
  section?: string
  title?: string
  provisionId?: string
}

/** Level-2 brief — loaded only when a judgment is opened. */
export interface JudgmentAnalysis {
  id: string
  ratio: string
  legalPrinciple: string
  issues: string[]
  /** Flat list kept for compatibility */
  arguments: string[]
  decision: string
  importantSections: string[]
  relatedCases: string[]
  facts: string[]
  holding: string
  reasoning: JudgmentReasoningBlock[]
  provisions: JudgmentProvisionRef[]
  examPoints: string[]
  bench?: string
  judges: string[]
  subject?: string
  tags: string[]
  appellantArgs: string[]
  respondentArgs: string[]
}

export interface TopicIndexRecord {
  id: string
  subject: string
  title: string
  shortSummary: string
  relatedJudgmentIds: string[]
  relatedCanonicalIds: string[]
  status: PublicationStatus
}

export interface SearchQuery {
  q?: string
  court?: string
  year?: number
  topic?: string
  limit?: number
  offset?: number
}

export interface SearchResult<T> {
  total: number
  limit: number
  offset: number
  items: T[]
}

export const DEFAULT_SEARCH_LIMIT = 20
export const MAX_SEARCH_LIMIT = 50
