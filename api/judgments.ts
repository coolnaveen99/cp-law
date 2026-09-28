// Self-contained Vercel serverless function with NO relative imports

interface JudgmentIndexRecord {
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

function isSafeId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-_]{0,63}$/i.test(id)
}

function clampLimit(value: unknown, fallback = 20, max = 50): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(Math.max(Math.floor(value), 1), max)
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/$/, '')
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    return res.status(200).json({
      items: [],
      total: 0,
      offset: 0,
      limit: 20,
      warning: 'supabase_not_configured',
      missing: [!url ? 'SUPABASE_URL' : null, !key ? 'SUPABASE_SERVICE_ROLE_KEY' : null].filter(Boolean),
    })
  }

  try {
    const id = typeof req.query?.id === 'string' ? req.query.id : undefined
    if (id) {
      if (!isSafeId(id)) {
        return res.status(400).json({ error: 'invalid_id' })
      }
      const response = await fetch(`${url}/rest/v1/judgment_index?id=eq.${encodeURIComponent(id)}&status=eq.published&limit=1`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      })
      if (!response.ok) {
        return res.status(response.status).json({ error: 'supabase_error' })
      }
      const rows: any[] = await response.json()
      if (!rows.length) {
        return res.status(404).json({ error: 'not_found' })
      }
      return res.status(200).json(mapJudgment(rows[0]))
    }

    const q = typeof req.query?.q === 'string' ? req.query.q : undefined
    const court = typeof req.query?.court === 'string' ? req.query.court : undefined
    const topic = typeof req.query?.topic === 'string' ? req.query.topic : undefined
    const year = req.query?.year ? Number(req.query.year) : undefined
    const limit = clampLimit(req.query?.limit ? Number(req.query.limit) : undefined, 20, 50)
    const offset = Math.max(0, req.query?.offset ? Number(req.query.offset) : 0)

    const params = new URLSearchParams()
    params.set('select', '*')
    params.set('status', 'eq.published')
    params.set('order', 'year.desc')
    params.set('limit', String(limit))
    params.set('offset', String(offset))

    if (court) params.set('court', `eq.${court}`)
    if (year) params.set('year', `eq.${year}`)
    if (topic) params.set('topics', `cs.{${topic}}`)
    if (q) {
      const term = q.trim()
      params.set('or', `(case_name.ilike.*${term}*,citation.ilike.*${term}*,short_summary.ilike.*${term}*)`)
    }

    const response = await fetch(`${url}/rest/v1/judgment_index?${params.toString()}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        Prefer: 'count=exact',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'supabase_error' })
    }

    const contentRange = response.headers.get('content-range')
    let total = 0
    if (contentRange) {
      const match = contentRange.match(/\/(\d+|\*)$/)
      if (match && match[1] !== '*') total = Number(match[1])
    }

    const rows: any[] = await response.json()
    if (!total && rows.length) total = rows.length

    return res.status(200).json({
      items: rows.map(mapJudgment),
      total,
      offset,
      limit,
    })
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err?.message || String(err) })
  }
}
