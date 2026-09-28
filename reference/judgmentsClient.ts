/**
 * Drop-in client for codepackr-law to query cp-law API.
 * Copy this file to: codepackr-law/src/services/judgmentsClient.ts
 */

export interface JudgmentSummary {
  id: string
  caseName: string
  court: string
  courtLevel: string
  year: number
  citation: string
  topics: string[]
  shortSummary: string
  documentAvailable: boolean
  analysisAvailable: boolean
}

export interface JudgmentDetail extends JudgmentSummary {
  ratio?: string
  legalPrinciple?: string
  facts?: string[]
  issues?: string[]
  holding?: string
  reasoning?: Array<{ heading: string; explanation: string }>
  provisions?: Array<{ actName?: string; article?: string; section?: string; title?: string }>
  examPoints?: string[]
  bench?: string
  judges?: string[]
  appellantArgs?: string[]
  respondentArgs?: string[]
}

const BASE_URL = import.meta.env.VITE_CP_LAW_API_URL || 'https://cp-law-alpha.vercel.app/api'
const cache = new Map<string, any>()

export const JudgmentsClient = {
  /**
   * Level 1: Search and list judgments (lightweight metadata)
   */
  async search(
    query?: string,
    topic?: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: JudgmentSummary[]; total: number }> {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (topic) params.set('topic', topic)
    params.set('limit', String(limit))
    params.set('offset', String(offset))

    const key = `search:${params.toString()}`
    if (cache.has(key)) return cache.get(key)

    const res = await fetch(`${BASE_URL}/judgments?${params}`)
    if (!res.ok) throw new Error(`Failed to fetch judgments: ${res.statusText}`)
    const data = await res.json()
    cache.set(key, data)
    return data
  },

  /**
   * Level 2: Load full case brief on-demand when student clicks a case
   */
  async getById(id: string): Promise<JudgmentDetail> {
    const key = `case:${id}`
    if (cache.has(key)) return cache.get(key)

    // Fetch index metadata
    const metaRes = await fetch(`${BASE_URL}/judgments?id=${encodeURIComponent(id)}`)
    if (!metaRes.ok) throw new Error(`Judgment not found: ${id}`)
    const meta = await metaRes.json()

    // Fetch deep analysis brief
    let analysis = {}
    try {
      const aRes = await fetch(`${BASE_URL}/judgments/${encodeURIComponent(id)}/analysis`)
      if (aRes.ok) {
        analysis = await aRes.json()
      }
    } catch (err) {
      console.warn(`Could not load analysis for ${id}:`, err)
    }

    const fullDetail: JudgmentDetail = { ...meta, ...analysis }
    cache.set(key, fullDetail)
    return fullDetail
  },

  /**
   * Clear in-memory cache
   */
  clearCache(): void {
    cache.clear()
  },
}
