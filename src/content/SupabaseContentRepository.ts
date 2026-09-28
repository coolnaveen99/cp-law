import type { ContentRepository } from './ContentRepository'
import { isSafeId } from './searchUtils'
import type {
  JudgmentAnalysis,
  JudgmentIndexRecord,
  SearchQuery,
  SearchResult,
  TopicIndexRecord,
} from './types'

export class SupabaseContentRepository implements ContentRepository {
  private url: string
  private key: string

  constructor(url: string, key: string) {
    this.url = url.replace(/\/$/, '')
    this.key = key
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      Accept: 'application/json',
      ...extra,
    }
  }

  async searchJudgments(query: SearchQuery): Promise<SearchResult<JudgmentIndexRecord>> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50)
    const offset = Math.max(query.offset ?? 0, 0)

    const params = new URLSearchParams()
    params.set('select', '*')
    params.set('status', 'eq.published')
    params.set('order', 'year.desc')
    params.set('limit', String(limit))
    params.set('offset', String(offset))

    if (query.court) {
      params.set('court', `ilike.*${query.court}*`)
    }
    if (query.year) {
      params.set('year', `eq.${query.year}`)
    }
    if (query.topic) {
      params.set('topics', `cs.{${query.topic}}`)
    }
    if (query.q) {
      const q = query.q.trim()
      params.set(
        'or',
        `(case_name.ilike.*${q}*,citation.ilike.*${q}*,citation_normalized.ilike.*${q}*,short_summary.ilike.*${q}*)`,
      )
    }

    const res = await fetch(`${this.url}/rest/v1/judgment_index?${params.toString()}`, {
      headers: this.headers({ Prefer: 'count=exact' }),
    })

    if (!res.ok) {
      return { items: [], total: 0, limit, offset }
    }

    const contentRange = res.headers.get('content-range')
    let total = 0
    if (contentRange) {
      const parts = contentRange.split('/')
      if (parts[1]) {
        total = Number.parseInt(parts[1], 10) || 0
      }
    }

    const data = (await res.json()) as any[]
    const items = data.map((row) => this.mapJudgment(row))
    if (!contentRange) {
      total = items.length
    }

    return { items, total, limit, offset }
  }

  async getJudgmentIndex(id: string): Promise<JudgmentIndexRecord | null> {
    if (!isSafeId(id)) return null

    const res = await fetch(
      `${this.url}/rest/v1/judgment_index?select=*&id=eq.${encodeURIComponent(id)}&status=eq.published`,
      { headers: this.headers() },
    )
    if (!res.ok) return null

    const data = (await res.json()) as any[]
    if (!data.length) return null
    return this.mapJudgment(data[0])
  }

  async getJudgmentAnalysis(id: string): Promise<JudgmentAnalysis | null> {
    if (!isSafeId(id)) return null

    const res = await fetch(
      `${this.url}/rest/v1/judgment_analysis?select=*&id=eq.${encodeURIComponent(id)}`,
      { headers: this.headers() },
    )
    if (!res.ok) return null

    const data = (await res.json()) as any[]
    if (!data.length) return null

    const row = data[0]
    return {
      id: row.id,
      ratio: row.ratio,
      legalPrinciple: row.legal_principle,
      issues: row.issues || [],
      arguments: row.arguments || [],
      decision: row.decision,
      importantSections: row.important_sections || [],
      relatedCases: row.related_cases || [],
    }
  }

  async listTopics(): Promise<TopicIndexRecord[]> {
    const res = await fetch(
      `${this.url}/rest/v1/topic_index?select=*&status=eq.published&order=title.asc`,
      { headers: this.headers() },
    )
    if (!res.ok) return []

    const data = (await res.json()) as any[]
    return data.map((row) => this.mapTopic(row))
  }

  async getTopic(id: string): Promise<TopicIndexRecord | null> {
    if (!isSafeId(id)) return null

    const res = await fetch(
      `${this.url}/rest/v1/topic_index?select=*&id=eq.${encodeURIComponent(id)}&status=eq.published`,
      { headers: this.headers() },
    )
    if (!res.ok) return null

    const data = (await res.json()) as any[]
    if (!data.length) return null
    return this.mapTopic(data[0])
  }

  private mapJudgment(row: any): JudgmentIndexRecord {
    return {
      id: row.id,
      caseName: row.case_name,
      court: row.court,
      courtLevel: row.court_level,
      date: row.judgment_date,
      year: row.year,
      citation: row.citation,
      citationNormalized: row.citation_normalized,
      topics: row.topics || [],
      sections: row.sections || [],
      keywords: row.keywords || [],
      shortSummary: row.short_summary,
      sourceReference: row.source_reference,
      sourceUrl: row.source_url || undefined,
      documentAvailable: Boolean(row.document_available),
      analysisAvailable: Boolean(row.analysis_available),
      status: row.status,
      checksum: row.checksum || undefined,
    }
  }

  private mapTopic(row: any): TopicIndexRecord {
    return {
      id: row.id,
      subject: row.subject,
      title: row.title,
      shortSummary: row.short_summary,
      relatedJudgmentIds: row.related_judgment_ids || [],
      relatedCanonicalIds: row.related_canonical_ids || [],
      status: row.status,
    }
  }
}
