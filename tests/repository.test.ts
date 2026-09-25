import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LocalContentRepository } from '../src/content/LocalContentRepository'
import { clampLimit, isSafeId, normalizeCitation } from '../src/content/searchUtils'

const repo = new LocalContentRepository()

describe('LocalContentRepository', () => {
  it('searches published fixtures by citation fragment', async () => {
    const result = await repo.searchJudgments({ q: 'AIR 1973' })
    assert.equal(result.total, 1)
    assert.equal(result.items[0]?.id, 'kesavananda-bharati-1973')
  })

  it('loads analysis only for an opened judgment', async () => {
    const analysis = await repo.getJudgmentAnalysis('puttaswamy-2017')
    assert.ok(analysis)
    assert.match(analysis.ratio, /privacy/i)
  })

  it('rejects unsafe ids', async () => {
    const record = await repo.getJudgmentIndex('../secrets')
    assert.equal(record, null)
  })

  it('lists published topics', async () => {
    const topics = await repo.listTopics()
    assert.ok(topics.some((topic) => topic.id === 'basic-structure'))
  })
})

describe('search helpers', () => {
  it('caps result size', () => {
    assert.equal(clampLimit(500), 50)
  })

  it('normalizes citations', () => {
    assert.equal(normalizeCitation('AIR 1973 SC 1461'), 'air 1973 sc 1461')
  })

  it('accepts slug ids only', () => {
    assert.equal(isSafeId('kesavananda-bharati-1973'), true)
    assert.equal(isSafeId('id with space'), false)
  })
})
