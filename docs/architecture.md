# CP-AS-2 architecture

Live production remains `coolnaveen99/codepackr-law` → https://law.codepackr.com.
This repository is a parallel platform. Do not open PRs against the live repo from this work.

## Decision

GitHub stores application source. Legal content lives in a data layer.

Stage A stack:

- Private GitHub: `cp-as-2`
- Vercel: site + API
- Supabase Free: metadata + selected analysis
- Google Drive: raw PDF archive only

Cloudflare R2/D1 is Stage B if Vercel/Supabase limits are actually hit.

## Privacy

Server hosts published library content.
Server never receives MCQ answers, scores, flashcards, or user notes.

## Content levels

1. Essential metadata — every relevant judgment/topic
2. Legal analysis — important records only
3. Original PDF/OCR — selected records, object storage, not Git

## Repository contract

`ContentRepository` is the only UI/API boundary.

- `LocalContentRepository` — fixtures, tests, offline default
- `RemoteContentRepository` — `/api/*`

Replace the server adapter with Supabase without changing page code.

## Rules

1. Do not copy the live `src/data` corpus into this Git repo.
2. Do not add a bulk export endpoint.
3. Do not put secrets in source.
4. Keep canonical IDs stable (`ARTICLE:`, `SECTION:`, `CASE:`, `DOCTRINE:`).
5. Search the index. Fetch analysis on open.
6. Measure corpus size before paying for infrastructure.
