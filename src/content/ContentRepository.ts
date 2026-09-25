import type {
  JudgmentAnalysis,
  JudgmentIndexRecord,
  SearchQuery,
  SearchResult,
  TopicIndexRecord,
} from './types'

/**
 * Stable content boundary. UI and API both speak this interface.
 * Local fixtures implement it today. Supabase implements it later.
 */
export interface ContentRepository {
  searchJudgments(query: SearchQuery): Promise<SearchResult<JudgmentIndexRecord>>
  getJudgmentIndex(id: string): Promise<JudgmentIndexRecord | null>
  getJudgmentAnalysis(id: string): Promise<JudgmentAnalysis | null>
  listTopics(): Promise<TopicIndexRecord[]>
  getTopic(id: string): Promise<TopicIndexRecord | null>
}
