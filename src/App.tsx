import { useEffect, useMemo, useState } from 'react'
import { createRepository } from './content/createRepository'
import type { JudgmentAnalysis, JudgmentIndexRecord, TopicIndexRecord } from './content/types'

const repo = createRepository()

type Route =
  | { name: 'home'; q: string }
  | { name: 'judgment'; id: string }
  | { name: 'topic'; id: string }

function parseRoute(): Route {
  const params = new URLSearchParams(window.location.search)
  const judgment = params.get('judgment')
  const topic = params.get('topic')
  const q = params.get('q') ?? ''
  if (judgment) return { name: 'judgment', id: judgment }
  if (topic) return { name: 'topic', id: topic }
  return { name: 'home', q }
}

export function App() {
  const [route, setRoute] = useState<Route>(parseRoute)

  useEffect(() => {
    const onPop = () => setRoute(parseRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function go(search: string) {
    const url = search ? `/?${search}` : '/'
    window.history.pushState({}, '', url)
    setRoute(parseRoute())
  }

  return (
    <div className="wrap">
      <p className="banner">
        CP-AS-2 is a new architecture repo. The live library stays at{' '}
        <a href="https://law.codepackr.com">law.codepackr.com</a> and the old
        GitHub repository is not modified from here.
      </p>
      {route.name === 'home' && <Home q={route.q} go={go} />}
      {route.name === 'judgment' && <JudgmentPage id={route.id} go={go} />}
      {route.name === 'topic' && <TopicPage id={route.id} go={go} />}
    </div>
  )
}

function Home({ q, go }: { q: string; go: (search: string) => void }) {
  const [draft, setDraft] = useState(q)
  const [items, setItems] = useState<JudgmentIndexRecord[]>([])
  const [topics, setTopics] = useState<TopicIndexRecord[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false
    repo.searchJudgments({ q, limit: 20 }).then((result) => {
      if (!cancelled) {
        setItems(result.items)
        setTotal(result.total)
      }
    })
    repo.listTopics().then((list) => {
      if (!cancelled) setTopics(list)
    })
    return () => {
      cancelled = true
    }
  }, [q])

  return (
    <>
      <h1>Codepackr Law — AS-2</h1>
      <p className="lede">
        Search the compact index. Full analysis loads only when a case is opened.
        Corpus lives outside Git.
      </p>
      <form
        className="search"
        onSubmit={(event) => {
          event.preventDefault()
          go(draft ? `q=${encodeURIComponent(draft)}` : '')
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search case, citation, topic…"
          aria-label="Search judgments"
        />
        <button type="submit">Search</button>
      </form>
      <p className="meta">{total} published index records</p>
      <div className="grid">
        {items.map((item) => (
          <article key={item.id} className="card">
            <h2>
              <a
                href={`/?judgment=${item.id}`}
                onClick={(event) => {
                  event.preventDefault()
                  go(`judgment=${item.id}`)
                }}
              >
                {item.caseName}
              </a>
            </h2>
            <p className="meta">
              {item.citation} · {item.court} · {item.year}
            </p>
            <p>{item.shortSummary}</p>
          </article>
        ))}
      </div>
      <div className="topics">
        {topics.map((topic) => (
          <a
            key={topic.id}
            className="chip"
            href={`/?topic=${topic.id}`}
            onClick={(event) => {
              event.preventDefault()
              go(`topic=${topic.id}`)
            }}
          >
            {topic.title}
          </a>
        ))}
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul className="bullets">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>
      ))}
    </ul>
  )
}

function JudgmentPage({ id, go }: { id: string; go: (search: string) => void }) {
  const [record, setRecord] = useState<JudgmentIndexRecord | null | undefined>(undefined)
  const [analysis, setAnalysis] = useState<JudgmentAnalysis | null>(null)

  useEffect(() => {
    let cancelled = false
    repo.getJudgmentIndex(id).then((value) => {
      if (!cancelled) setRecord(value)
    })
    repo.getJudgmentAnalysis(id).then((value) => {
      if (!cancelled) setAnalysis(value)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (record === undefined) return <p className="lede">Loading index…</p>
  if (!record) return <p className="lede">Judgment not in the published index.</p>

  const tags = analysis?.tags?.length ? analysis.tags : record.keywords

  return (
    <>
      <a
        className="back"
        href="/"
        onClick={(event) => {
          event.preventDefault()
          go('')
        }}
      >
        ← Index
      </a>

      <div className="judgment-header card">
        {(analysis?.subject || analysis?.bench) && (
          <p className="eyebrow">
            {[analysis?.subject, record.year, analysis?.bench].filter(Boolean).join(' · ')}
          </p>
        )}
        <h1>{record.caseName}</h1>
        <p className="meta">
          {record.citation} · {record.court}
          {record.date ? ` · ${record.date}` : ''}
        </p>
        {tags.length > 0 && (
          <div className="topics inline-tags">
            {tags.map((tag) => (
              <span key={tag} className="chip static">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <Section title="Case Overview">
        <p>{record.shortSummary}</p>
      </Section>

      {analysis?.facts?.length > 0 && (
        <Section title="Material Facts">
          <BulletList items={analysis.facts} />
        </Section>
      )}

      {analysis?.issues?.length > 0 && (
        <Section title="Legal Issues">
          <BulletList items={analysis.issues} />
        </Section>
      )}

      {analysis?.provisions?.length > 0 && (
        <Section title="Provisions">
          <ul className="bullets">
            {analysis.provisions.map((p, index) => (
              <li key={index}>
                <strong>
                  {[p.article, p.section].filter(Boolean).join(' / ') || p.provisionId || 'Provision'}
                </strong>
                {p.actName ? ` — ${p.actName}` : ''}
                {p.title ? `: ${p.title}` : ''}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(analysis?.appellantArgs?.length > 0 ||
        analysis?.respondentArgs?.length > 0 ||
        analysis?.arguments?.length > 0) && (
        <Section title="Arguments">
          {analysis.appellantArgs?.length > 0 && (
            <>
              <h3 className="subhead">Appellant / Petitioner</h3>
              <BulletList items={analysis.appellantArgs} />
            </>
          )}
          {analysis.respondentArgs?.length > 0 && (
            <>
              <h3 className="subhead">Respondent</h3>
              <BulletList items={analysis.respondentArgs} />
            </>
          )}
          {!analysis.appellantArgs?.length &&
            !analysis.respondentArgs?.length &&
            analysis.arguments?.length > 0 && <BulletList items={analysis.arguments} />}
        </Section>
      )}

      {analysis?.reasoning?.length > 0 && (
        <Section title="Court's Reasoning">
          {analysis.reasoning.map((block, index) => (
            <div key={index} className="reason-block">
              {block.heading && <h3 className="subhead">{block.heading}</h3>}
              <p>{block.explanation}</p>
            </div>
          ))}
        </Section>
      )}

      {(analysis?.decision || analysis?.holding || analysis?.ratio) && (
        <Section title="Decision & Ratio">
          {analysis.holding && (
            <>
              <h3 className="subhead">Holding</h3>
              <p>{analysis.holding}</p>
            </>
          )}
          {analysis.decision && (
            <>
              <h3 className="subhead">Decision</h3>
              <p>{analysis.decision}</p>
            </>
          )}
          {analysis.ratio && (
            <>
              <h3 className="subhead">Ratio Decidendi</h3>
              <p>{analysis.ratio}</p>
            </>
          )}
          {analysis.legalPrinciple && (
            <p className="meta principle">{analysis.legalPrinciple}</p>
          )}
        </Section>
      )}

      {analysis?.examPoints?.length > 0 && (
        <Section title="Exam Points">
          <BulletList items={analysis.examPoints} />
        </Section>
      )}

      {analysis?.relatedCases?.length > 0 && (
        <Section title="Related Cases">
          <div className="topics">
            {analysis.relatedCases.map((caseId) => (
              <a
                key={caseId}
                className="chip"
                href={`/?judgment=${caseId}`}
                onClick={(event) => {
                  event.preventDefault()
                  go(`judgment=${caseId}`)
                }}
              >
                {caseId}
              </a>
            ))}
          </div>
        </Section>
      )}

      {!analysis && record.analysisAvailable && (
        <p className="lede">Analysis flagged available but not loaded.</p>
      )}

      {record.sourceUrl && (
        <p className="source-line">
          Official / public source:{' '}
          <a href={record.sourceUrl} target="_blank" rel="noreferrer">
            {record.sourceReference}
          </a>
        </p>
      )}
    </>
  )
}

function TopicPage({ id, go }: { id: string; go: (search: string) => void }) {
  const [topic, setTopic] = useState<TopicIndexRecord | null | undefined>(undefined)
  const related = useMemo(() => topic?.relatedJudgmentIds ?? [], [topic])
  const [cases, setCases] = useState<JudgmentIndexRecord[]>([])

  useEffect(() => {
    let cancelled = false
    repo.getTopic(id).then((value) => {
      if (!cancelled) setTopic(value)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    Promise.all(related.map((judgmentId) => repo.getJudgmentIndex(judgmentId))).then((rows) => {
      if (!cancelled) setCases(rows.filter((row): row is JudgmentIndexRecord => Boolean(row)))
    })
    return () => {
      cancelled = true
    }
  }, [related])

  if (topic === undefined) return <p className="lede">Loading topic…</p>
  if (!topic) return <p className="lede">Topic not published.</p>

  return (
    <>
      <a
        className="back"
        href="/"
        onClick={(event) => {
          event.preventDefault()
          go('')
        }}
      >
        ← Index
      </a>
      <h1>{topic.title}</h1>
      <p className="meta">{topic.subject}</p>
      <p>{topic.shortSummary}</p>
      <div className="grid">
        {cases.map((item) => (
          <article key={item.id} className="card">
            <h2>
              <a
                href={`/?judgment=${item.id}`}
                onClick={(event) => {
                  event.preventDefault()
                  go(`judgment=${item.id}`)
                }}
              >
                {item.caseName}
              </a>
            </h2>
            <p className="meta">{item.citation}</p>
          </article>
        ))}
      </div>
    </>
  )
}
