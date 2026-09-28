# Reference Guide: Linking `codepackr-law`, Cleanup & Future Workflow

This folder contains all instructions, drop-in client code, cleanup terminal commands, and ingestion workflows in one place so you can execute them whenever you are ready.

---

## Table of Contents
1. [Linking codepackr-law to cp-law](#1-linking-codepackr-law-to-cp-law)
2. [Guidance to Remove Previous Dumps from codepackr-law](#2-guidance-to-remove-previous-dumps-from-codepackr-law)
3. [How to Add Future Judgments in cp-law](#3-how-to-add-future-judgments-in-cp-law)
4. [Project Documentation & Agent Reference Map](#4-project-documentation--agent-reference-map)
5. [Ready-to-Use Artifacts in This Folder](#5-ready-to-use-artifacts-in-this-folder)

---

## 1. Linking `codepackr-law` to `cp-law`

Instead of bundling static TypeScript files into the frontend, `codepackr-law` now queries `cp-law` via API.

### Step A: Configure Environment Variable in `codepackr-law`
In `codepackr-law/.env`:
```env
VITE_CP_LAW_API_URL=https://cp-law-alpha.vercel.app/api
```
*(Or your own custom production URL for the deployed `cp-law` instance).*

### Step B: Add the Drop-in Client to `codepackr-law`
Create `src/services/judgmentsClient.ts` in `codepackr-law` (you can copy directly from `reference/judgmentsClient.ts` in this repo):

```typescript
const BASE_URL = import.meta.env.VITE_CP_LAW_API_URL || 'https://cp-law-alpha.vercel.app/api'
const cache = new Map<string, any>()

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

export const JudgmentsClient = {
  // Level 1: Lightweight search and list
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

  // Level 2: Load full case brief on-demand when student clicks a case
  async getById(id: string): Promise<JudgmentDetail> {
    const key = `case:${id}`
    if (cache.has(key)) return cache.get(key)

    const metaRes = await fetch(`${BASE_URL}/judgments?id=${encodeURIComponent(id)}`)
    if (!metaRes.ok) throw new Error(`Judgment not found: ${id}`)
    const meta = await metaRes.json()

    let analysis = {}
    try {
      const aRes = await fetch(`${BASE_URL}/judgments/${encodeURIComponent(id)}/analysis`)
      if (aRes.ok) analysis = await aRes.json()
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

## 2. Guidance to Remove Previous Dumps from `codepackr-law`

Run these commands inside your local clone of **`codepackr-law`**:

```bash
cd path/to/codepackr-law

# 1. Create a migration branch
git checkout -b chore/remove-static-judgment-dumps

# 2. Delete all monolithic batch files (saves ~3MB of code bloat)
rm -f src/data/judgments/famous-landmarks-batch-*.ts
rm -f src/data/judgments/famous-landmarks-batch.ts
rm -f src/data/judgments/legacy-batch-*.ts
rm -f src/data/judgments/kesavananda.ts

# 3. In src/data/judgments/index.ts, re-export JudgmentsClient and types:
#    export * from './types'
#    export { JudgmentsClient } from '../../services/judgmentsClient'
#    export const ALL_JUDGMENTS = [] // keep minimal fallback for tests

# 4. Verify build and tests pass
npm run build
npm test

# 5. Commit and push
git add src/data/judgments/
git commit -m "chore: remove monolithic judgment batch files in favor of cp-law backend"
```

---

## 3. How to Add Future Judgments in `cp-law`

To keep Git lean, raw case files are staged in `.gitignore` and published directly to Supabase.

### A. Generate Template for a New Case
```bash
npm run case:init shreya-singhal-2015
```
This generates `staging/shreya-singhal-2015.json` pre-filled with all standard fields (Level-1 metadata and Level-2 analysis: facts, holding, reasoning, provisions, exam points, arguments, bench, judges).

### B. Edit the JSON File
Fill in the details in `staging/shreya-singhal-2015.json`.

### C. Dry-Run & Schema Validation
```bash
npm run staging:dry
```
Validates required fields, date formats, and canonical ID structure without writing to the database.

### D. Ingest & Publish to Supabase
```bash
npm run staging:ingest
```
Directly upserts into `judgment_index`, `judgment_analysis`, and `topic_index` in Supabase.

*(You can also place multiple JSON files in `staging/` and publish them in a single batch).*

---

## 4. Project Documentation & Agent Reference Map

| File Path | Description |
|---|---|
| `.github/copilot-instructions.md` | Strict AI coding rules for Copilot, Cursor, and Windsurf (preserving canonical IDs, Git hygiene, zero student telemetry on server). |
| `.github/agents/law-curator.md` | Specification and schema requirements for the Law Curator Agent. |
| `docs/codepackr-law-migration.md` | In-depth migration guide with code snippets, cleanup commands, and checklist. |
| `docs/adding-judgments.md` | Complete future judgment authoring and ingestion guide. |
| `scripts/ingest-case.ts` | Case template generator, schema validator, and Supabase upsert tool. |
| `reference/judgmentsClient.ts` | Ready-to-copy client module for `codepackr-law`. |
| `reference/sample-case.json` | Sample full-depth case JSON for reference. |

---

## 5. Ready-to-Use Artifacts in This Folder

- [`reference/judgmentsClient.ts`](./judgmentsClient.ts): Ready-to-drop-in TypeScript client for `codepackr-law`.
- [`reference/sample-case.json`](./sample-case.json): Canonical example of a fully structured judgment brief.
