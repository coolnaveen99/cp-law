import type { VercelRequest, VercelResponse } from '../../_vercel'
import { isSafeId } from '../../../src/content/searchUtils'
import { getServerRepository } from '../../../src/content/serverRepository'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const repo = getServerRepository()

  try {
    const id = typeof req.query.id === 'string' ? req.query.id : ''
    if (!isSafeId(id)) {
      res.status(400).json({ error: 'invalid_id' })
      return
    }

    const analysis = await repo.getJudgmentAnalysis(id)
    if (!analysis) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    res.status(200).json(analysis)
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', message: err?.message || String(err) })
  }
}
