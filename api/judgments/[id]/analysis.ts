// Self-contained Vercel serverless function with NO relative imports

interface JudgmentAnalysis {
  id: string
  ratio: string
  legalPrinciple: string
  issues: string[]
  arguments: string[]
  decision: string
  importantSections: string[]
  relatedCases: string[]
}

function isSafeId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-_]{0,63}$/i.test(id)
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const id = typeof req.query?.id === 'string' ? req.query.id : undefined
  if (!id || !isSafeId(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/$/, '')
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    return res.status(404).json({ error: 'not_found' })
  }

  try {
    const response = await fetch(`${url}/rest/v1/judgment_analysis?id=eq.${encodeURIComponent(id)}&limit=1`, {
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

    return res.status(200).json(mapAnalysis(rows[0]))
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err?.message || String(err) })
  }
}
