import type { JudgmentAnalysis, JudgmentIndexRecord } from '../../content/types'

export const FIXTURE_JUDGMENTS: JudgmentIndexRecord[] = [
  {
    id: 'kesavananda-bharati-1973',
    caseName: 'Kesavananda Bharati Sripadagalvaru v. State of Kerala',
    court: 'Supreme Court of India',
    courtLevel: 'supreme-court',
    date: '1973-04-24',
    year: 1973,
    citation: 'AIR 1973 SC 1461',
    citationNormalized: 'air 1973 sc 1461',
    topics: ['basic-structure', 'amendment-power', 'constitution'],
    sections: ['ARTICLE:CONSTITUTION:ARTICLE-368', 'ARTICLE:CONSTITUTION:ARTICLE-13'],
    keywords: ['basic structure', 'constitutional amendment', 'fundamental rights'],
    shortSummary:
      'Parliament may amend the Constitution, including fundamental rights, but cannot destroy its basic structure.',
    sourceReference: 'AIR 1973 SC 1461',
    sourceUrl: 'https://indiankanoon.org/doc/257876/',
    documentAvailable: false,
    analysisAvailable: true,
    status: 'published',
  },
  {
    id: 'maneka-gandhi-1978',
    caseName: 'Maneka Gandhi v. Union of India',
    court: 'Supreme Court of India',
    courtLevel: 'supreme-court',
    date: '1978-01-25',
    year: 1978,
    citation: 'AIR 1978 SC 597',
    citationNormalized: 'air 1978 sc 597',
    topics: ['article-21', 'due-process', 'passport'],
    sections: ['ARTICLE:CONSTITUTION:ARTICLE-21', 'ARTICLE:CONSTITUTION:ARTICLE-14'],
    keywords: ['personal liberty', 'procedure established by law', 'passport'],
    shortSummary:
      'Article 21 procedure must be fair, just and reasonable. Articles 14, 19 and 21 are read together.',
    sourceReference: 'AIR 1978 SC 597',
    sourceUrl: 'https://indiankanoon.org/doc/1766147/',
    documentAvailable: false,
    analysisAvailable: true,
    status: 'published',
  },
  {
    id: 'puttaswamy-2017',
    caseName: 'Justice K.S. Puttaswamy (Retd.) v. Union of India',
    court: 'Supreme Court of India',
    courtLevel: 'supreme-court',
    date: '2017-08-24',
    year: 2017,
    citation: '(2017) 10 SCC 1',
    citationNormalized: '2017 10 scc 1',
    topics: ['privacy', 'article-21', 'fundamental-rights'],
    sections: ['ARTICLE:CONSTITUTION:ARTICLE-21'],
    keywords: ['privacy', 'aadhaar', 'dignity'],
    shortSummary:
      'The right to privacy is a fundamental right protected by Article 21 and the liberty cluster of Part III.',
    sourceReference: '(2017) 10 SCC 1',
    sourceUrl: 'https://indiankanoon.org/doc/127517806/',
    documentAvailable: false,
    analysisAvailable: true,
    status: 'published',
  },
]

export const FIXTURE_ANALYSIS: Record<string, JudgmentAnalysis> = {
  'kesavananda-bharati-1973': {
    id: 'kesavananda-bharati-1973',
    ratio:
      'The amending power under Article 368 does not include the power to alter the basic structure of the Constitution.',
    legalPrinciple: 'Basic structure doctrine.',
    issues: [
      'Whether Parliament can amend fundamental rights.',
      'Whether there is an implied limitation on Article 368.',
    ],
    arguments: [
      'Petitioner: amendment cannot destroy essential features.',
      'Union: amending power is plenary.',
    ],
    decision:
      'By majority, Parliament may amend the Constitution but cannot abrogate its basic structure.',
    importantSections: ['ARTICLE:CONSTITUTION:ARTICLE-368'],
    relatedCases: ['minerva-mills-1980', 'i-r-coelho-2007'],
  },
  'maneka-gandhi-1978': {
    id: 'maneka-gandhi-1978',
    ratio:
      'The procedure contemplated by Article 21 must be right, just and fair, not arbitrary, fanciful or oppressive.',
    legalPrinciple: 'Substantive content of procedure established by law.',
    issues: ['Whether impounding a passport without hearing violates Article 21.'],
    arguments: [
      'Petitioner: personal liberty includes the right to travel and requires fair procedure.',
      'Union: Article 21 requires only a legally enacted procedure.',
    ],
    decision:
      'Passport Act procedure must satisfy fairness. Articles 14, 19 and 21 form a golden triangle.',
    importantSections: ['ARTICLE:CONSTITUTION:ARTICLE-21', 'ARTICLE:CONSTITUTION:ARTICLE-14'],
    relatedCases: ['a-k-gopalan-1950', 'puttaswamy-2017'],
  },
  'puttaswamy-2017': {
    id: 'puttaswamy-2017',
    ratio: 'Privacy is intrinsic to life and liberty under Article 21.',
    legalPrinciple: 'Privacy as a fundamental right.',
    issues: ['Whether the Constitution guarantees a fundamental right to privacy.'],
    arguments: [
      'Petitioners: privacy is inherent in dignity and liberty.',
      'Union: no express privacy guarantee; prior benches had denied it.',
    ],
    decision:
      'Nine-judge bench held that privacy is a fundamental right. M.P. Sharma and Kharak Singh were overruled on this point.',
    importantSections: ['ARTICLE:CONSTITUTION:ARTICLE-21'],
    relatedCases: ['maneka-gandhi-1978', 'kharak-singh-1964'],
  },
}
