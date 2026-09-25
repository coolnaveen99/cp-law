import { FIXTURE_ANALYSIS, FIXTURE_JUDGMENTS } from '../data/fixtures/judgments'
import { FIXTURE_TOPICS } from '../data/fixtures/topics'
import type { ContentRepository } from './ContentRepository'
import { isSafeId, matchesQuery, paginate } from './searchUtils'
import type {
  JudgmentAnalysis,
  JudgmentIndexRecord,
  SearchQuery,
  SearchResult,
  TopicIndexRecord,
} from './types'

export class LocalContentRepository implements ContentRepository {
  async searchJudgments(query: SearchQuery): Promise<SearchResult<JudgmentIndexRecord>> {
    const published = FIXTURE_JUDGMENTS.filter((item) => item.status === 'published')
    const matched = published.filter((item) => matchesQuery(item, query))
    return paginate(matched, query)
  }

  async getJudgmentIndex(id: string): Promise<JudgmentIndexRecord | null> {
    if (!isSafeId(id)) return null
    return FIXTURE_JUDGMENTS.find((item) => item.id === id && item.status === 'published') ?? null
  }

  async getJudgmentAnalysis(id: string): Promise<JudgmentAnalysis | null> {
    if (!isSafeId(id)) return null
    const index = await this.getJudgmentIndex(id)
    if (!index?.analysisAvailable) return null
    return FIXTURE_ANALYSIS[id] ?? null
  }

  async listTopics(): Promise<TopicIndexRecord[]> {
    return FIXTURE_TOPICS.filter((item) => item.status === 'published')
  }

  async getTopic(id: string): Promise<TopicIndexRecord | null> {
    if (!isSafeId(id)) return null
    return FIXTURE_TOPICS.find((item) => item.id === id && item.status === 'published') ?? null
  }
}
