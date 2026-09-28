// Self-contained Vercel serverless function with NO relative imports

interface TopicIndexRecord {
  id: string
  subject: string
  title: string
  shortSummary: string
  relatedJudgmentIds: string[]
  relatedCanonicalIds: string[]
  status: 'draft' | 'published'
}

function isSafeId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-_]{0,63}$/i.test(id)
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
    return res.status(200).json({ items: [] })
  }

  try {
    const id = typeof req.query?.id === 'string' ? req.query.id : undefined
    if (id) {
      if (!isSafeId(id)) {
        return res.status(400).json({ error: 'invalid_id' })
      }
      const response = await fetch(`${url}/rest/v1/topic_index?id=eq.${encodeURIComponent(id)}&status=eq.published&limit=1`, {
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
      return res.status(200).json(mapTopic(rows[0]))
    }

    const response = await fetch(`${url}/rest/v1/topic_index?select=*&status=eq.published&order=title.asc`, {
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
    return res.status(200).json({ items: rows.map(mapTopic) })
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err?.message || String(err) })
  }
}
