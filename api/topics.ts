import type { VercelRequest, VercelResponse } from './_vercel'
import { fetchTopicsFromSupabase } from './_supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    const topics = await fetchTopicsFromSupabase()
    res.status(200).json(topics)
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err?.message || String(err) })
  }
}
