/**
 * Case Ingestion Script for CP-AS-2.
 *
 * Rules:
 * - Never commit raw case corpus into Git.
 * - Canonical IDs must be slug-formatted (e.g. "shreya-singhal-2015").
 * - Validates schema before sending to Supabase.
 * - Upserts to judgment_index, judgment_analysis, and topic_index.
 *
 * Usage:
 *   # 1. Generate a blank template for a new case:
 *   npx tsx scripts/ingest-case.ts --init shreya-singhal-2015
 *
 *   # 2. Dry run / validate your case JSON:
 *   npx tsx scripts/ingest-case.ts --file staging/shreya-singhal-2015.json --dry-run
 *
 *   # 3. Publish to Supabase:
 *   npx tsx scripts/ingest-case.ts --file staging/shreya-singhal-2015.json --publish
 *
 *   # 4. Ingest all cases in staging folder:
 *   npx tsx scripts/ingest-case.ts --dir staging --publish
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

type CasePayload = {
  id: string
  caseName: string
  court?: string
  judgmentDate?: string
  year: number
  citation: string
  neutralCitation?: string
  topics?: string[]
  provisions?: Array<{
    actName?: string
    article?: string
    section?: string
    title?: string
    provisionId?: string
  }>
  keywords?: string[]
  summary?: string
  sourceUrl?: string
  pdfPath?: string
  status?: 'draft' | 'reviewed' | 'published'

  // Level 2 Analysis fields
  ratioDecidendi?: string
  holding?: string
  facts?: string[]
  issues?: string[]
  arguments?: {
    appellant?: string[]
    respondent?: string[]
  }
  decision?: string
  reasoning?: Array<{
    heading: string
    explanation: string
  }>
  examPoints?: string[]
  bench?: string
  judges?: string[]
  subject?: string
  relatedCases?: string[]
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

function validateCase(c: CasePayload, fileName: string): string[] {
  const errors: string[] = []
  if (!c.id || typeof c.id !== 'string') {
    errors.push('id is required and must be a string')
  } else if (!/^[a-z0-9][a-z0-9-_]{2,63}$/.test(c.id)) {
    errors.push(`id "${c.id}" must be lowercase alphanumeric with hyphens (e.g. "shreya-singhal-2015")`)
  }

  if (!c.caseName || typeof c.caseName !== 'string') {
    errors.push('caseName is required')
  }

  if (!c.year || typeof c.year !== 'number' || c.year < 1900 || c.year > 2100) {
    errors.push('year must be a 4-digit number (e.g. 2015)')
  }

  if (!c.citation || typeof c.citation !== 'string') {
    errors.push('citation is required (e.g. "(2015) 5 SCC 1")')
  }

  if (c.provisions && !Array.isArray(c.provisions)) {
    errors.push('provisions must be an array')
  }

  if (c.reasoning && !Array.isArray(c.reasoning)) {
    errors.push('reasoning must be an array of { heading, explanation }')
  }

  if (errors.length) {
    return errors.map((e) => `[${fileName}] ${e}`)
  }
  return []
}

function generateTemplate(id: string): CasePayload {
  const parts = id.split('-')
  const possibleYear = Number(parts[parts.length - 1])
  const year = !isNaN(possibleYear) && possibleYear > 1900 ? possibleYear : new Date().getFullYear()

  return {
    id,
    caseName: id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') + ' v. Union of India',
    court: 'Supreme Court of India',
    year,
    judgmentDate: `${year}-01-01`,
    citation: `(${year}) SCC`,
    neutralCitation: `${year} INSC`,
    topics: ['constitutional-law', 'fundamental-rights'],
    provisions: [
      {
        actName: 'Constitution of India',
        article: '19(1)(a)',
        title: 'Freedom of Speech and Expression',
      },
    ],
    keywords: ['freedom of speech', 'article 19', 'landmark'],
    summary: 'Concise 2-sentence summary of the landmark dispute and core legal outcome.',
    ratioDecidendi: 'The central legal holding and rule of law articulated by the Court.',
    holding: 'Core takeaway of the case.',
    facts: [
      'Material fact 1 describing the background of the dispute.',
      'Material fact 2 describing the proceedings leading to the Supreme Court.',
    ],
    issues: ['Whether Section X violates Article 19(1)(a) of the Constitution?'],
    arguments: {
      appellant: ['Appellant contended that the statutory restriction was vague and arbitrary.'],
      respondent: ['State defended the provision under reasonable restrictions of public order.'],
    },
    decision: 'The Court struck down the impugned provision as unconstitutional.',
    reasoning: [
      {
        heading: 'Chilling Effect & Overbreadth',
        explanation: 'The statute created an impermissible chilling effect on legitimate free speech.',
      },
    ],
    examPoints: [
      'Landmark authority on online speech freedom under Article 19(1)(a).',
      'Established the clear distinction between discussion, advocacy, and incitement.',
    ],
    bench: '2-Judge Bench',
    judges: ['Justice A', 'Justice B'],
    subject: 'Constitutional Law',
    status: 'published',
  }
}

async function upsert(
  baseUrl: string,
  key: string,
  table: string,
  rows: any[],
  onConflict: string,
  dryRun: boolean,
) {
  if (rows.length === 0) return { table, count: 0 }
  if (dryRun) {
    console.log(`[dry-run] would upsert ${rows.length} row(s) into ${table}`)
    return { table, count: rows.length }
  }

  // De-duplicate by primary key
  const seen = new Set<string>()
  const deduped: any[] = []
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]
    const pkey = String(row[onConflict] || '')
    if (pkey && !seen.has(pkey)) {
      seen.add(pkey)
      deduped.unshift(row)
    }
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
    body: JSON.stringify(deduped),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${table} upsert failed (${res.status}): ${body.slice(0, 500)}`)
  }
  console.log(`upserted ${deduped.length} row(s) → ${table}`)
  return { table, count: deduped.length }
}

async function main() {
  loadEnvLocal()
  const argv = process.argv.slice(2)

  let initId = ''
  let filePath = ''
  let dirPath = ''
  let dryRun = false
  let publish = true

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--init' && argv[i + 1]) {
      initId = argv[++i]
    } else if (a === '--file' && argv[i + 1]) {
      filePath = argv[++i]
    } else if (a === '--dir' && argv[i + 1]) {
      dirPath = argv[++i]
    } else if (a === '--dry-run') {
      dryRun = true
    } else if (a === '--draft') {
      publish = false
    } else if (a === '--publish') {
      publish = true
    } else if (a === '--help' || a === '-h') {
      console.log(`
Case Ingestion Tool for CP-AS-2
==============================
Usage:
  npx tsx scripts/ingest-case.ts --init <canonical-id>
      Generate a blank case template in staging/<id>.json

  npx tsx scripts/ingest-case.ts --file <path/to/case.json> [--dry-run] [--publish|--draft]
      Validate and upsert a single case JSON to Supabase

  npx tsx scripts/ingest-case.ts --dir <staging-directory> [--dry-run] [--publish|--draft]
      Validate and batch upsert all JSON files in the directory
      `)
      process.exit(0)
    }
  }

  // Handle template init
  if (initId) {
    const safeId = initId.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/^-+|-+$/g, '')
    const targetDir = resolve(process.cwd(), 'staging')
    if (!existsSync(targetDir)) {
      const fs = await import('node:fs')
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const targetFile = join(targetDir, `${safeId}.json`)
    const template = generateTemplate(safeId)
    writeFileSync(targetFile, JSON.stringify(template, null, 2) + '\n', 'utf8')
    console.log(`Template generated at: ${targetFile}`)
    console.log(`Edit the file and run: npx tsx scripts/ingest-case.ts --file ${targetFile} --publish`)
    process.exit(0)
  }

  const filesToProcess: string[] = []
  if (filePath) {
    const resolved = resolve(filePath)
    if (!existsSync(resolved)) {
      throw new Error(`File not found: ${resolved}`)
    }
    filesToProcess.push(resolved)
  } else if (dirPath) {
    const resolved = resolve(dirPath)
    if (!existsSync(resolved)) {
      throw new Error(`Directory not found: ${resolved}`)
    }
    for (const name of readdirSync(resolved)) {
      if (name.endsWith('.json') && !name.startsWith('.')) {
        const fullPath = join(resolved, name)
        if (statSync(fullPath).isFile()) {
          filesToProcess.push(fullPath)
        }
      }
    }
  } else {
    console.error('Please specify --init <id>, --file <path>, or --dir <path>. Run with --help for details.')
    process.exit(1)
  }

  if (filesToProcess.length === 0) {
    console.log('No JSON case files found to process.')
    process.exit(0)
  }

  console.log(`Found ${filesToProcess.length} case file(s) to process.`)

  const allErrors: string[] = []
  const cases: CasePayload[] = []

  for (const f of filesToProcess) {
    try {
      const raw = readFileSync(f, 'utf8')
      const parsed = JSON.parse(raw)
      const errs = validateCase(parsed, f)
      if (errs.length) {
        allErrors.push(...errs)
      } else {
        cases.push(parsed)
      }
    } catch (e: any) {
      allErrors.push(`[${f}] JSON parse error: ${e.message}`)
    }
  }

  if (allErrors.length) {
    console.error('\nValidation errors found:')
    for (const err of allErrors) {
      console.error(` - ${err}`)
    }
    console.error('\nFix the above issues before ingesting.')
    process.exit(1)
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!dryRun && (!supabaseUrl || !serviceKey)) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local')
  }

  const judgmentRows: any[] = []
  const analysisRows: any[] = []
  const topicMap = new Map<string, any>()

  for (const c of cases) {
    const year = Number(c.year)
    const citation = c.citation || c.neutralCitation || c.caseName
    const status = publish ? 'published' : c.status || 'draft'

    const sections = (c.provisions || []).map((p) => {
      if (p.article) {
        return `ARTICLE:${String(p.actName || 'CONSTITUTION').toUpperCase().replace(/[^A-Z0-9]/g, '-')}:${String(p.article).replace(/\s+/g, '-').toUpperCase()}`
      }
      if (p.section) {
        return `SECTION:${String(p.actName || 'ACT').toUpperCase().replace(/[^A-Z0-9]/g, '-')}:${String(p.section).replace(/\s+/g, '-').toUpperCase()}`
      }
      return `PROVISION:${String(p.provisionId || 'unknown')}`
    })

    const topics = (c.topics || []).map(slugTopic)
    const keywords = (c.keywords || []).map((k) => String(k).toLowerCase())

    judgmentRows.push({
      id: c.id,
      case_name: c.caseName,
      court: c.court || 'Supreme Court of India',
      court_level: mapCourtLevel(c.court),
      judgment_date: c.judgmentDate || `${year}-01-01`,
      year,
      citation,
      citation_normalized: normalizeCitation(citation),
      topics,
      sections,
      keywords,
      short_summary: (c.summary || c.holding || c.ratioDecidendi || '').slice(0, 500),
      source_reference: citation,
      source_url: c.sourceUrl || null,
      document_available: Boolean(c.sourceUrl || c.pdfPath),
      analysis_available: Boolean(c.ratioDecidendi || c.holding || c.decision || c.facts?.length),
      status,
    })

    const appellant = (c.arguments?.appellant || []).map(String)
    const respondent = (c.arguments?.respondent || []).map(String)
    const combinedArgs = [
      ...appellant.map((x) => `Appellant: ${x}`),
      ...respondent.map((x) => `Respondent: ${x}`),
    ]

    analysisRows.push({
      id: c.id,
      ratio: (c.ratioDecidendi || c.holding || c.decision || '').slice(0, 4000),
      legal_principle: (c.holding || c.ratioDecidendi || 'See ratio.').slice(0, 1000),
      issues: (c.issues || []).map(String),
      arguments: combinedArgs,
      decision: (c.decision || c.holding || '').slice(0, 4000),
      important_sections: sections,
      related_cases: (c.relatedCases || []).map(slugTopic),
      facts: (c.facts || []).map(String),
      holding: (c.holding || '').slice(0, 4000),
      reasoning: (c.reasoning || []).map((r) => ({
        heading: String(r.heading || ''),
        explanation: String(r.explanation || ''),
      })),
      provisions: (c.provisions || []).map((p) => ({
        actName: p.actName,
        article: p.article,
        section: p.section,
        title: p.title,
        provisionId: p.provisionId,
      })),
      exam_points: (c.examPoints || []).map(String),
      bench: c.bench || null,
      judges: (c.judges || []).map(String),
      subject: c.subject || null,
      tags: keywords,
      appellant_args: appellant,
      respondent_args: respondent,
    })

    for (const t of topics) {
      if (!t) continue
      const existing = topicMap.get(t)
      if (existing) {
        if (!existing.related_judgment_ids.includes(c.id)) {
          existing.related_judgment_ids.push(c.id)
        }
      } else {
        topicMap.set(t, {
          id: t,
          title: t
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          parent_id: null,
          short_summary: `Topic linked from judgments (${t}).`,
          related_judgment_ids: [c.id],
          related_canonical_ids: [],
          status,
        })
      }
    }
  }

  const topicRows = Array.from(topicMap.values())

  console.log(
    `Prepared ${judgmentRows.length} judgment(s), ${analysisRows.length} analysis brief(s), ${topicRows.length} topic(s). DryRun=${dryRun}`,
  )

  await upsert(supabaseUrl!, serviceKey!, 'judgment_index', judgmentRows, 'id', dryRun)
  await upsert(supabaseUrl!, serviceKey!, 'judgment_analysis', analysisRows, 'id', dryRun)
  await upsert(supabaseUrl!, serviceKey!, 'topic_index', topicRows, 'id', dryRun)

  console.log('\nSuccess! All cases processed.')
}

main().catch((err) => {
  console.error('\nExecution failed:', err.message || err)
  process.exit(1)
})
