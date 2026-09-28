# Linking codepackr-law to cp-law & Removing Legacy Dumps

This guide provides step-by-step instructions to link the **`codepackr-law`** student learning application to this **`cp-law`** backend, and safely remove the legacy TypeScript judgment batch files.

---

## 1. Why Decouple?

In the previous setup, `codepackr-law` bundled all judgments statically inside Git:
- **18+ monolithic files**: `famous-landmarks-batch-1.ts` through `famous-landmarks-batch-18.ts`.
- **Bundle bloat**: ~3 MB of static legal text loaded on every initial page visit.
- **Git bloat**: Every typo fix in a judgment created large Git diffs in the learning app.

With **`cp-law`**:
- All **302 judgments** and **300 full-depth case briefs** live in Supabase.
- Search queries query lightweight Level-1 metadata (`/api/judgments`).
- Full Level-2 analysis (facts, reasoning, exam points) loads on-demand only when a student clicks a case (`/api/judgments/[id]/analysis`).

---

## 2. Linking `codepackr-law` to `cp-law`

In your `codepackr-law` repository, replace the static imports with a remote judgments client.

### Step 2.1: Add Environment Variable to `codepackr-law`
In `codepackr-law/.env`:
```env
# URL of your deployed cp-law instance (e.g. Vercel)
VITE_CP_LAW_API_URL=https://cp-law-alpha.vercel.app/api
```

### Step 2.2: Create the Client in `codepackr-law`
Create `src/services/judgmentsClient.ts` in `codepackr-law`:

```typescript
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
   * Search judgments (Level 1 metadata)
   */
  async search(query?: string, topic?: string, limit = 20, offset = 0): Promise<{ items: JudgmentSummary[]; total: number }> {
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
   * Load full case brief (Level 2 analysis) on-demand
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
      const analysisRes = await fetch(`${BASE_URL}/judgments/${encodeURIComponent(id)}/analysis`)
      if (analysisRes.ok) {
        analysis = await analysisRes.json()
      }
    } catch (err) {
      console.warn(`Could not load analysis for ${id}:`, err)
    }

    const fullDetail: JudgmentDetail = { ...meta, ...analysis }
    cache.set(key, fullDetail)
    return fullDetail
  },
}
```

---

## 3. Removing Legacy Dumps in `codepackr-law`

Run these steps inside your local **`codepackr-law`** clone:

### Step 3.1: Create a Clean Branch
```bash
git checkout -b chore/remove-static-judgment-dumps
```

### Step 3.2: Delete the Monolithic Batch Files
```bash
# Delete all static judgment batch files
rm -f src/data/judgments/famous-landmarks-batch-*.ts
rm -f src/data/judgments/famous-landmarks-batch.ts
rm -f src/data/judgments/legacy-batch-*.ts
rm -f src/data/judgments/kesavananda.ts
```

### Step 3.3: Replace `src/data/judgments/index.ts`
Replace `src/data/judgments/index.ts` in `codepackr-law` with a lightweight bridge:

```typescript
// Re-export types and client interface
export * from './types'
export { JudgmentsClient } from '../../services/judgmentsClient'

// Keep a minimal fallback array (optional) for offline tests
export const ALL_JUDGMENTS = []
```

### Step 3.4: Verify Build
```bash
npm run build
npm test
```

### Step 3.5: Commit the Cleanup
```bash
git add src/data/judgments/
git commit -m "chore: remove monolithic judgment batch files in favor of cp-law backend"
git push origin chore/remove-static-judgment-dumps
```

---

## 4. Verification Checklist
- [x] Initial JS bundle in `codepackr-law` drops significantly in size.
- [x] Case search in `codepackr-law` queries `/api/judgments` seamlessly.
- [x] Clicking a landmark case loads full facts, holding, reasoning, and exam points on-demand.
- [x] Student bookmarks, MCQ answers, and notes remain 100% local (zero telemetry sent to server).
