/**
 * Local one-way exporter → Supabase.
 *
 * Rules:
 * - Never git push to codepackr-law
 * - Never commit exported corpus into this repo
 * - Reads credentials only from process env / .env.local
 *
 * Usage:
 *   npx tsx scripts/export-to-supabase.ts --from fixtures
 *   npx tsx scripts/export-to-supabase.ts --from codepackr-law --law-path ../codepackr-law
 *   npx tsx scripts/export-to-supabase.ts --from codepackr-law --law-path ../codepackr-law --limit 30 --publish
 *   npx tsx scripts/export-to-supabase.ts --from codepackr-law --law-path ../codepackr-law --dry-run
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

type Args = {
  from: 'fixtures' | 'codepackr-law'
  lawPath?: string
  limit?: number
  publish: boolean
  dryRun: boolean
  includeAnalysis: boolean
}

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    from: 'fixtures',
    publish: false,
    dryRun: false,
    includeAnalysis: true,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--from' && argv[i + 1]) {
      const v = argv[++i]
      if (v !== 'fixtures' && v !== 'codepackr-law') {
        throw new Error(`--from must be fixtures | codepackr-law, got ${v}`)
      }
      args.from = v
    } else if (a === '--law-path' && argv[i + 1]) {
      args.lawPath = argv[++i]
    } else if (a === '--limit' && argv[i + 1]) {
      args.limit = Math.max(1, Number(argv[++i]) || 1)
    } else if (a === '--publish') {
      args.publish = true
    } else if (a === '--dry-run') {
      args.dryRun = true
    } else if (a === '--no-analysis') {
      args.includeAnalysis = false
    } else if (a === '--help' || a === '-h') {
      printHelp()
      process.exit(0)
    }
  }
  return args
}

function printHelp() {
  console.log(`export-to-supabase.ts

  --from fixtures|codepackr-law   Source (default: fixtures)
  --law-path <dir>                Local checkout of codepackr-law
  --limit <n>                     Max judgments to upsert
  --publish                       Force status=published (default: map source status)
  --no-analysis                   Skip judgment_analysis rows
  --dry-run                       Print counts only; no writes
`)
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Missing env ${name}. Set it in .env.local`)
  return v
}

function normalizeCitation(citation: string): string {
  return citation.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function slugTopic(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapCourtLevel(court?: string): string {
  const c = (court || '').toLowerCase()
  if (c.includes('supreme')) return 'supreme-court'
  if (c.includes('high')) return 'high-court'
  return 'other'
}

function mapStatus(
  source: string | undefined,
  forcePublish: boolean,
): 'draft' | 'reviewed' | 'published' | 'withdrawn' {
  if (forcePublish) return 'published'
  if (source === 'published') return 'published'
  if (source === 'reviewed') return 'reviewed'
  return 'draft'
}

type JudgmentRow = {
  id: string
  case_name: string
  court: string
  court_level: string
  judgment_date: string
  year: number
  citation: string
  citation_normalized: string
  topics: string[]
  sections: string[]
  keywords: string[]
  short_summary: string
  source_reference: string
  source_url: string | null
  document_available: boolean
  analysis_available: boolean
  status: string
}

type AnalysisRow = {
  id: string
  ratio: string
  legal_principle: string
  issues: string[]
  arguments: string[]
  decision: string
  important_sections: string[]
  related_cases: string[]
}

type TopicRow = {
  id: string
  subject: string
  title: string
  short_summary: string
  related_judgment_ids: string[]
  related_canonical_ids: string[]
  status: string
}

async function upsert(
  baseUrl: string,
  key: string,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  dryRun: boolean,
) {
  if (!rows.length) return { table, count: 0 }
  if (dryRun) {
    console.log(`[dry-run] would upsert ${rows.length} row(s) into ${table}`)
    return { table, count: rows.length }
  }

  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${table} upsert failed (${res.status}): ${body.slice(0, 500)}`)
  }
  console.log(`upserted ${rows.length} row(s) → ${table}`)
  return { table, count: rows.length }
}

async function loadFromFixtures(forcePublish: boolean, includeAnalysis: boolean) {
  const { FIXTURE_JUDGMENTS, FIXTURE_ANALYSIS } = await import('../src/data/fixtures/judgments.ts')
  const { FIXTURE_TOPICS } = await import('../src/data/fixtures/topics.ts')

  const judgments: JudgmentRow[] = FIXTURE_JUDGMENTS.map((j) => ({
    id: j.id,
    case_name: j.caseName,
    court: j.court,
    court_level: j.courtLevel,
    judgment_date: j.date,
    year: j.year,
    citation: j.citation,
    citation_normalized: j.citationNormalized,
    topics: j.topics,
    sections: j.sections,
    keywords: j.keywords,
    short_summary: j.shortSummary,
    source_reference: j.sourceReference,
    source_url: j.sourceUrl ?? null,
    document_available: j.documentAvailable,
    analysis_available: j.analysisAvailable,
    status: mapStatus(j.status, forcePublish),
  }))

  const analyses: AnalysisRow[] = includeAnalysis
    ? Object.values(FIXTURE_ANALYSIS).map((a) => ({
        id: a.id,
        ratio: a.ratio,
        legal_principle: a.legalPrinciple,
        issues: a.issues,
        arguments: a.arguments,
        decision: a.decision,
        important_sections: a.importantSections,
        related_cases: a.relatedCases,
      }))
    : []

  const topics: TopicRow[] = FIXTURE_TOPICS.map((t) => ({
    id: t.id,
    subject: t.subject,
    title: t.title,
    short_summary: t.shortSummary,
    related_judgment_ids: t.relatedJudgmentIds,
    related_canonical_ids: t.relatedCanonicalIds,
    status: mapStatus(t.status, forcePublish),
  }))

  return { judgments, analyses, topics }
}

function parseConstitutionCases(fileText: string, forcePublish: boolean): JudgmentRow[] {
  const rows: JudgmentRow[] = []
  const blockRe =
    /\{\s*id:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*citation:\s*"([^"]+)"\s*,\s*year:\s*(\d+)\s*,[\s\S]*?holding:\s*"([\s\S]*?)"\s*,\s*articles:\s*\[([^\]]*)\]\s*,\s*tags:\s*\[([^\]]*)\]/g

  let match: RegExpExecArray | null
  while ((match = blockRe.exec(fileText))) {
    const id = match[1]
    const name = match[2]
    const citation = match[3]
    const year = Number(match[4])
    const holding = match[5].replace(/\s+/g, ' ').trim()
    const articles = match[6]
      .split(',')
      .map((s) => s.replace(/["'\s]/g, ''))
      .filter(Boolean)
      .map((a) => `ARTICLE:CONSTITUTION:ARTICLE-${a}`)
    const tags = match[7]
      .split(',')
      .map((s) => s.replace(/["']/g, '').trim())
      .filter(Boolean)

    rows.push({
      id: id.includes('-') ? id : `${id}-${year}`,
      case_name: name,
      court: 'Supreme Court of India',
      court_level: 'supreme-court',
      judgment_date: `${year}-01-01`,
      year,
      citation,
      citation_normalized: normalizeCitation(citation),
      topics: tags.map(slugTopic),
      sections: articles,
      keywords: tags.map((t) => t.toLowerCase()),
      short_summary: holding.slice(0, 400),
      source_reference: citation,
      source_url: null,
      document_available: false,
      analysis_available: false,
      status: mapStatus('published', forcePublish),
    })
  }
  return rows
}

async function loadFromCodepackrLaw(
  lawPath: string,
  forcePublish: boolean,
  includeAnalysis: boolean,
  limit?: number,
) {
  const root = resolve(lawPath)
  if (!existsSync(root)) {
    throw new Error(`codepackr-law path not found: ${root}`)
  }

  const judgments: JudgmentRow[] = []
  const analyses: AnalysisRow[] = []
  const topics: TopicRow[] = []

  // 1) Full Judgment objects when import works
  try {
    const indexUrl = pathToFileURL(join(root, 'src/data/judgments/index.ts')).href
    const mod = await import(indexUrl)
    const all = (mod.ALL_JUDGMENTS || []) as any[]
    console.log(`loaded ${all.length} judgments from codepackr-law judgments/index`)

    for (const j of all) {
      if (limit && judgments.length >= limit) break
      const status = mapStatus(j.status, forcePublish)
      const sections = (j.provisions || []).map((p: any) => {
        if (p.article) {
          return `ARTICLE:${String(p.actId || 'CONSTITUTION').toUpperCase()}:${String(p.article).replace(/\s+/g, '-').toUpperCase()}`
        }
        if (p.section) {
          return `SECTION:${String(p.actId || 'ACT').toUpperCase()}:${String(p.section).replace(/\s+/g, '-').toUpperCase()}`
        }
        return `PROVISION:${String(p.provisionId || 'unknown')}`
      })

      const year = Number(j.year) || 1970
      const citation = j.citation || j.neutralCitation || `${j.caseName}`
      const hasAnalysis = Boolean(j.ratioDecidendi || j.holding || j.decision)

      judgments.push({
        id: j.id,
        case_name: j.caseName,
        court: j.court || 'Supreme Court of India',
        court_level: mapCourtLevel(j.court),
        judgment_date: j.judgmentDate || `${year}-01-01`,
        year,
        citation,
        citation_normalized: normalizeCitation(citation),
        topics: (j.topics || []).map((t: string) => slugTopic(String(t))),
        sections,
        keywords: (j.tags || []).map((t: string) => String(t).toLowerCase()),
        short_summary: String(j.summary || j.holding || '').slice(0, 500),
        source_reference: citation,
        source_url: j.source?.sourceUrl || null,
        document_available: Boolean(j.source?.pdfPath || j.source?.sourceUrl),
        analysis_available: includeAnalysis && hasAnalysis,
        status,
      })

      if (includeAnalysis && hasAnalysis) {
        const argBits: string[] = []
        if (j.arguments?.appellant?.length) {
          argBits.push(...j.arguments.appellant.map((x: string) => `Appellant: ${x}`))
        }
        if (j.arguments?.respondent?.length) {
          argBits.push(...j.arguments.respondent.map((x: string) => `Respondent: ${x}`))
        }

        analyses.push({
          id: j.id,
          ratio: String(j.ratioDecidendi || j.holding || j.decision || '').slice(0, 2000),
          legal_principle: String(j.holding || j.ratioDecidendi || 'See ratio.').slice(0, 500),
          issues: (j.issues || []).map(String),
          arguments: argBits,
          decision: String(j.decision || j.holding || '').slice(0, 2000),
          important_sections: sections,
          related_cases: (j.relatedCases || [])
            .map((r: any) => r.judgmentId || slugTopic(r.caseName || ''))
            .filter(Boolean),
        })
      }
    }
  } catch (err: any) {
    console.warn(
      `could not import judgments/index.ts (${err?.message || err}). Falling back to constitution/cases.ts parser.`,
    )
  }

  // 2) Fallback / supplement: constitution landmark list (Level-1 only)
  const casesPath = join(root, 'src/data/constitution/cases.ts')
  if (existsSync(casesPath)) {
    const text = readFileSync(casesPath, 'utf8')
    const parsed = parseConstitutionCases(text, forcePublish)
    const existing = new Set(judgments.map((j) => j.id))
    for (const row of parsed) {
      if (limit && judgments.length >= limit) break
      // Prefer full judgment objects when already present
      if (existing.has(row.id)) continue
      // Also skip fuzzy duplicates by normalized citation
      const dup = judgments.some(
        (j) => j.citation_normalized === row.citation_normalized,
      )
      if (dup) continue
      judgments.push(row)
      existing.add(row.id)
    }
    console.log(`constitution/cases.ts contributed landmarks (total judgments now ${judgments.length})`)
  }

  // 3) Minimal topic rows derived from judgment topics
  const topicMap = new Map<string, TopicRow>()
  for (const j of judgments) {
    for (const t of j.topics) {
      if (!t) continue
      const id = t
      const prev = topicMap.get(id)
      if (prev) {
        if (!prev.related_judgment_ids.includes(j.id)) {
          prev.related_judgment_ids.push(j.id)
        }
      } else {
        topicMap.set(id, {
          id,
          subject: 'general',
          title: t
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          short_summary: `Topic linked from published index (${t}).`,
          related_judgment_ids: [j.id],
          related_canonical_ids: [],
          status: forcePublish ? 'published' : 'draft',
        })
      }
    }
  }
  topics.push(...topicMap.values())

  return { judgments, analyses, topics }
}

async function main() {
  loadEnvLocal()
  const args = parseArgs(process.argv.slice(2))

  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  let judgments: JudgmentRow[] = []
  let analyses: AnalysisRow[] = []
  let topics: TopicRow[] = []

  if (args.from === 'fixtures') {
    ;({ judgments, analyses, topics } = await loadFromFixtures(
      args.publish,
      args.includeAnalysis,
    ))
  } else {
    if (!args.lawPath) {
      throw new Error('--law-path is required when --from codepackr-law')
    }
    ;({ judgments, analyses, topics } = await loadFromCodepackrLaw(
      args.lawPath,
      args.publish,
      args.includeAnalysis,
      args.limit,
    ))
  }

  if (args.limit) {
    judgments = judgments.slice(0, args.limit)
    const keep = new Set(judgments.map((j) => j.id))
    analyses = analyses.filter((a) => keep.has(a.id))
  }

  console.log(
    `prepared judgments=${judgments.length} analyses=${analyses.length} topics=${topics.length} dryRun=${args.dryRun}`,
  )

  // Index first (FK target for analysis)
  await upsert(supabaseUrl, serviceKey, 'judgment_index', judgments as any, 'id', args.dryRun)
  if (args.includeAnalysis) {
    await upsert(supabaseUrl, serviceKey, 'judgment_analysis', analyses as any, 'id', args.dryRun)
  }
  await upsert(supabaseUrl, serviceKey, 'topic_index', topics as any, 'id', args.dryRun)

  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
