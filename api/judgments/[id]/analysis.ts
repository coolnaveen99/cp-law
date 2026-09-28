// Self-contained Vercel serverless function with NO relative imports

function isSafeId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-_]{0,63}$/i.test(id)
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function asReasoning(value: unknown): { heading: string; explanation: string }[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    heading: String((item as any)?.heading || ''),
    explanation: String((item as any)?.explanation || ''),
  }))
}

function asProvisions(value: unknown): {
  actName?: string
  article?: string
  section?: string
  title?: string
  provisionId?: string
}[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    actName: (item as any)?.actName || (item as any)?.act_name || undefined,
    article: (item as any)?.article || undefined,
    section: (item as any)?.section || undefined,
    title: (item as any)?.title || undefined,
    provisionId: (item as any)?.provisionId || (item as any)?.provision_id || undefined,
  }))
}

function mapAnalysis(row: any) {
  return {
    id: row.id,
    ratio: row.ratio || '',
    legalPrinciple: row.legal_principle || '',
    issues: asStringArray(row.issues),
    arguments: asStringArray(row.arguments),
    decision: row.decision || '',
    importantSections: asStringArray(row.important_sections),
    relatedCases: asStringArray(row.related_cases),
    facts: asStringArray(row.facts),
    holding: row.holding || '',
    reasoning: asReasoning(row.reasoning),
    provisions: asProvisions(row.provisions),
    examPoints: asStringArray(row.exam_points),
    bench: row.bench || undefined,
    judges: asStringArray(row.judges),
    subject: row.subject || undefined,
    tags: asStringArray(row.tags),
    appellantArgs: asStringArray(row.appellant_args),
    respondentArgs: asStringArray(row.respondent_args),
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
    const response = await fetch(
      `${url}/rest/v1/judgment_analysis?id=eq.${encodeURIComponent(id)}&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      },
    )

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
