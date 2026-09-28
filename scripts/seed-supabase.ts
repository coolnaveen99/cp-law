import { FIXTURE_JUDGMENTS, FIXTURE_ANALYSIS } from '../src/data/fixtures/judgments'
import { FIXTURE_TOPICS } from '../src/data/fixtures/topics'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.')
  process.exit(1)
}

const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates',
}

async function seed() {
  console.log('Seeding Supabase fixtures...')

  // 1. Topics
  const topicRows = FIXTURE_TOPICS.map((t) => ({
    id: t.id,
    subject: t.subject,
    title: t.title,
    short_summary: t.shortSummary,
    related_judgment_ids: t.relatedJudgmentIds,
    related_canonical_ids: t.relatedCanonicalIds,
    status: t.status,
  }))

  const topicRes = await fetch(`${supabaseUrl}/rest/v1/topic_index`, {
    method: 'POST',
    headers,
    body: JSON.stringify(topicRows),
  })
  console.log('Topics upsert status:', topicRes.status)

  // 2. Judgments
  const judgmentRows = FIXTURE_JUDGMENTS.map((j) => ({
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
    source_url: j.sourceUrl,
    document_available: j.documentAvailable,
    analysis_available: j.analysisAvailable,
    status: j.status,
    checksum: j.checksum,
  }))

  const judgmentRes = await fetch(`${supabaseUrl}/rest/v1/judgment_index`, {
    method: 'POST',
    headers,
    body: JSON.stringify(judgmentRows),
  })
  console.log('Judgments upsert status:', judgmentRes.status)

  // 3. Analysis
  const analysisRows = Object.values(FIXTURE_ANALYSIS).map((a) => ({
    id: a.id,
    ratio: a.ratio,
    legal_principle: a.legalPrinciple,
    issues: a.issues,
    arguments: a.arguments,
    decision: a.decision,
    important_sections: a.importantSections,
    related_cases: a.relatedCases,
  }))

  const analysisRes = await fetch(`${supabaseUrl}/rest/v1/judgment_analysis`, {
    method: 'POST',
    headers,
    body: JSON.stringify(analysisRows),
  })
  console.log('Analysis upsert status:', analysisRes.status)

  console.log('Supabase seeding complete!')
}

seed().catch(console.error)
