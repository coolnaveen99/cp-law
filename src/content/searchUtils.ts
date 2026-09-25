import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  type JudgmentIndexRecord,
  type SearchQuery,
  type SearchResult,
} from './types'

export function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_SEARCH_LIMIT
  return Math.min(Math.max(1, Math.floor(limit)), MAX_SEARCH_LIMIT)
}

export function normalizeCitation(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function matchesQuery(record: JudgmentIndexRecord, query: SearchQuery): boolean {
  if (query.court && record.court.toLowerCase() !== query.court.toLowerCase()) {
    return false
  }
  if (query.year && record.year !== query.year) {
    return false
  }
  if (query.topic && !record.topics.some((topic) => topic.toLowerCase() === query.topic!.toLowerCase())) {
    return false
  }
  if (!query.q) return true

  const haystack = [
    record.caseName,
    record.citation,
    record.citationNormalized,
    record.shortSummary,
    record.keywords.join(' '),
    record.sections.join(' '),
    record.topics.join(' '),
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.q.toLowerCase().trim())
}

export function paginate<T>(items: T[], query: SearchQuery): SearchResult<T> {
  const limit = clampLimit(query.limit)
  const offset = Math.max(0, query.offset ?? 0)
  return {
    total: items.length,
    limit,
    offset,
    items: items.slice(offset, offset + limit),
  }
}

export function isSafeId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,120}$/i.test(id)
}
