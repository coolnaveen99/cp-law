import type { TopicIndexRecord } from '../../content/types'

export const FIXTURE_TOPICS: TopicIndexRecord[] = [
  {
    id: 'basic-structure',
    subject: 'constitution',
    title: 'Basic Structure Doctrine',
    shortSummary:
      'Implied limitation on the amending power. Landmark source: Kesavananda Bharati (1973).',
    relatedJudgmentIds: ['kesavananda-bharati-1973'],
    relatedCanonicalIds: ['ARTICLE:CONSTITUTION:ARTICLE-368', 'DOCTRINE:CONSTITUTION:BASIC-STRUCTURE'],
    status: 'published',
  },
  {
    id: 'article-21',
    subject: 'constitution',
    title: 'Article 21 — Protection of Life and Personal Liberty',
    shortSummary:
      'Expanded after Maneka Gandhi. Includes privacy after Puttaswamy.',
    relatedJudgmentIds: ['maneka-gandhi-1978', 'puttaswamy-2017'],
    relatedCanonicalIds: ['ARTICLE:CONSTITUTION:ARTICLE-21'],
    status: 'published',
  },
]
