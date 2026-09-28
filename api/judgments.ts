import type { VercelRequest, VercelResponse } from './_vercel'
import { clampLimit, isSafeId } from '../src/content/searchUtils'
import { getServerRepository } from '../src/content/serverRepository'

const repo = getServerRepository()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const id = typeof req.query.id === 'string' ? req.query.id : undefined
  if (id) {
    if (!isSafeId(id)) {
      res.status(400).json({ error: 'invalid_id' })
      return
    }
    const record = await repo.getJudgmentIndex(id)
    if (!record) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    res.status(200).json(record)
    return
  }

  const q = typeof req.query.q === 'string' ? req.query.q : undefined
  const court = typeof req.query.court === 'string' ? req.query.court : undefined
  const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined
  const year = req.query.year ? Number(req.query.year) : undefined
  const limit = clampLimit(req.query.limit ? Number(req.query.limit) : undefined)
  const offset = Math.max(0, req.query.offset ? Number(req.query.offset) : 0)

  const result = await repo.searchJudgments({ q, court, topic, year, limit, offset })
  res.status(200).json(result)
}
