import type { VercelRequest, VercelResponse } from './_vercel'
import { LocalContentRepository } from '../src/content/LocalContentRepository'
import { isSafeId } from '../src/content/searchUtils'

const repo = new LocalContentRepository()

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
    const topic = await repo.getTopic(id)
    if (!topic) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    res.status(200).json(topic)
    return
  }

  const items = await repo.listTopics()
  res.status(200).json({ items, total: items.length })
}
