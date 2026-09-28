import type { VercelRequest, VercelResponse } from '../../_vercel'
import { isSafeId, fetchAnalysisFromSupabase } from '../../_supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const id = typeof req.query.id === 'string' ? req.query.id : undefined
  if (!id || !isSafeId(id)) {
    res.status(400).json({ error: 'invalid_id' })
    return
  }

  try {
    const analysis = await fetchAnalysisFromSupabase(id)
    if (!analysis) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    res.status(200).json(analysis)
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err?.message || String(err) })
  }
}
