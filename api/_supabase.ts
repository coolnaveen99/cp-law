export interface JudgmentIndexRecord {
  id: string
  caseName: string
  court: string
  courtLevel: string
  judgmentDate: string
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
  status: 'draft' | 'published'
}

export interface JudgmentAnalysis {
  id: string
  ratio: string
  legalPrinciple: string
  issues: string[]
  arguments: string[]
  decision: string
  importantSections: string[]
  relatedCases: string[]
}

export interface TopicIndexRecord {
  id: string
  subject: string
  title: string
  shortSummary: string
  relatedJudgmentIds: string[]
  relatedCanonicalIds: string[]
  status: 'draft' | 'published'
}

export function isSafeId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-_]{0,63}$/i.test(id)
}

export function clampLimit(value: unknown, fallback = 20, max = 50): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(Math.max(Math.floor(value), 1), max)
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return { url, key }
}

function mapJudgment(row: any): JudgmentIndexRecord {
  return {
    id: row.id,
    caseName: row.case_name,
    court: row.court,
    courtLevel: row.court_level,
    judgmentDate: row.judgment_date,
    year: Number(row.year),
    citation: row.citation,
    citationNormalized: row.citation_normalized,
    topics: Array.isArray(row.topics) ? row.topics : [],
    sections: Array.isArray(row.sections) ? row.sections : [],
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    shortSummary: row.short_summary,
    sourceReference: row.source_reference,
    sourceUrl: row.source_url ?? undefined,
    documentAvailable: Boolean(row.document_available),
    analysisAvailable: Boolean(row.analysis_available),
    status: row.status,
  }
}

function mapTopic(row: any): TopicIndexRecord {
  return {
    id: row.id,
    subject: row.subject,
    title: row.title,
    shortSummary: row.short_summary,
    relatedJudgmentIds: Array.isArray(row.related_judgment_ids) ? row.related_judgment_ids : [],
    relatedCanonicalIds: Array.isArray(row.related_canonical_ids) ? row.related_canonical_ids : [],
    status: row.status,
  }
}

function mapAnalysis(row: any): JudgmentAnalysis {
  return {
    id: row.id,
    ratio: row.ratio,
    legalPrinciple: row.legal_principle,
    issues: Array.isArray(row.issues) ? row.issues : [],
    arguments: Array.isArray(row.arguments) ? row.arguments : [],
    decision: row.decision,
    importantSections: Array.isArray(row.important_sections) ? row.important_sections : [],
    relatedCases: Array.isArray(row.related_cases) ? row.related_cases : [],
  }
}

export async function fetchJudgmentsFromSupabase(query: {
  q?: string
  court?: string
  topic?: string
  year?: number
  limit?: number
  offset?: number
}): Promise<{ items: JudgmentIndexRecord[]; total: number; offset: number; limit: number }> {
  const { url, key } = getSupabaseConfig()
  const limit = clampLimit(query.limit, 20, 50)
  const offset = Math.max(0, query.offset ?? 0)

  if (!url || !key) {
    return { items: [], total: 0, offset, limit }
  }

  const params = new URLSearchParams()
  params.set('select', '*')
  params.set('status', 'eq.published')
  params.set('order', 'year.desc')
  params.set('limit', String(limit))
  params.set('offset', String(offset))

  if (query.court) params.set('court', `eq.${query.court}`)
  if (query.year) params.set('year', `eq.${query.year}`)
  if (query.topic) params.set('topics', `cs.{${query.topic}}`)
  if (query.q) {
    const term = query.q.trim()
    params.set(
      'or',
      `(case_name.ilike.*${term}*,citation.ilike.*${term}*,short_summary.ilike.*${term}*)`
    )
  }

  const res = await fetch(`${url}/rest/v1/judgment_index?${params.toString()}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      Prefer: 'count=exact',
    },
  })

  if (!res.ok) {
    throw new Error(`Supabase query failed: ${res.status} ${res.statusText}`)
  }

  const totalHeader = res.headers.get('content-range')
  let total = 0
  if (totalHeader) {
    const match = totalHeader.match(/\/(\d+|\*)$/)
    if (match && match[1] !== '*') total = Number(match[1])
  }

  const data: any[] = await res.json()
  const items = data.map(mapJudgment)
  if (!totalHeader) total = items.length

  return { items, total, offset, limit }
}

export async function fetchJudgmentByIdFromSupabase(id: string): Promise<JudgmentIndexRecord | null> {
  const { url, key } = getSupabaseConfig()
  if (!url || !key) return null

  const res = await fetch(`${url}/rest/v1/judgment_index?id=eq.${encodeURIComponent(id)}&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) return null
  const rows: any[] = await res.json()
  if (!rows || rows.length === 0) return null
  return mapJudgment(rows[0])
}

export async function fetchTopicsFromSupabase(): Promise<TopicIndexRecord[]> {
  const { url, key } = getSupabaseConfig()
  if (!url || !key) return []

  const res = await fetch(`${url}/rest/v1/topic_index?status=eq.published&order=title.asc`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Supabase query failed: ${res.status} ${res.statusText}`)
  }

  const rows: any[] = await res.json()
  return rows.map(mapTopic)
}

export async function fetchAnalysisFromSupabase(id: string): Promise<JudgmentAnalysis | null> {
  const { url, key } = getSupabaseConfig()
  if (!url || !key) return null

  const res = await fetch(`${url}/rest/v1/judgment_analysis?id=eq.${encodeURIComponent(id)}&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) return null
  const rows: any[] = await res.json()
  if (!rows || rows.length === 0) return null
  return mapAnalysis(rows[0])
}
