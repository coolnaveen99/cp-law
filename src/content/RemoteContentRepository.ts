import type { ContentRepository } from './ContentRepository'
import { clampLimit, isSafeId } from './searchUtils'
import type {
  JudgmentAnalysis,
  JudgmentIndexRecord,
  SearchQuery,
  SearchResult,
  TopicIndexRecord,
} from './types'

import { LocalContentRepository } from './LocalContentRepository'

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (response.status === 404) {
    return null as T
  }
  if (!response.ok) {
    throw new Error(`Content API failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export class RemoteContentRepository implements ContentRepository {
  private fallback = new LocalContentRepository()

  constructor(private readonly baseUrl = '/api') {}

  async searchJudgments(query: SearchQuery): Promise<SearchResult<JudgmentIndexRecord>> {
    try {
      const params = new URLSearchParams()
      if (query.q) params.set('q', query.q)
      if (query.court) params.set('court', query.court)
      if (query.year) params.set('year', String(query.year))
      if (query.topic) params.set('topic', query.topic)
      params.set('limit', String(clampLimit(query.limit)))
      params.set('offset', String(Math.max(0, query.offset ?? 0)))
      return await getJson(`${this.baseUrl}/judgments?${params.toString()}`)
    } catch {
      return this.fallback.searchJudgments(query)
    }
  }

  async getJudgmentIndex(id: string): Promise<JudgmentIndexRecord | null> {
    if (!isSafeId(id)) return null
    try {
      return await getJson(`${this.baseUrl}/judgments?id=${encodeURIComponent(id)}`)
    } catch {
      return this.fallback.getJudgmentIndex(id)
    }
  }

  async getJudgmentAnalysis(id: string): Promise<JudgmentAnalysis | null> {
    if (!isSafeId(id)) return null
    try {
      return await getJson(`${this.baseUrl}/judgments/${encodeURIComponent(id)}/analysis`)
    } catch {
      return this.fallback.getJudgmentAnalysis(id)
    }
  }

  async listTopics(): Promise<TopicIndexRecord[]> {
    try {
      const result = await getJson<{ items: TopicIndexRecord[] }>(`${this.baseUrl}/topics`)
      return result?.items ?? []
    } catch {
      return this.fallback.listTopics()
    }
  }

  async getTopic(id: string): Promise<TopicIndexRecord | null> {
    if (!isSafeId(id)) return null
    try {
      return await getJson(`${this.baseUrl}/topics?id=${encodeURIComponent(id)}`)
    } catch {
      return this.fallback.getTopic(id)
    }
  }
}
