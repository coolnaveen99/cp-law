# CP-AS-2 — Codepackr Law Architecture Split 2

Private next-generation content platform for Codepackr Law.

**This repository does not replace the live site.**

| Site | Repo | Status |
|---|---|---|
| https://law.codepackr.com | `coolnaveen99/codepackr-law` | Live. Do not modify from this project. |
| This codebase | `coolnaveen99/cp-as-2` | New architecture. Independent deploy. |

## Why a new repo

The live app ships legal content as TypeScript modules in Git. That is fine for the current curated library. It is the wrong physical model if the corpus grows.

CP-AS-2 splits **application code** from **legal content**:

```
PRIVATE GITHUB (this repo)
        |
        v
     VERCEL
        |
        v
  SUPABASE FREE
   /           \
PostgreSQL    Storage
 metadata     selected docs
   |
   v
 Search / API
   |
   v
 Browser

GOOGLE DRIVE = raw PDF archive only
```

The browser never reads GitHub. Student answers, scores, and notes never leave the device.

## What is in this repo

- `ContentRepository` interface
- `LocalContentRepository` (small fixtures for offline / tests)
- `RemoteContentRepository` (Vercel API → Supabase)
- Compact Level-1 metadata + on-demand Level-2 analysis
- Postgres schema + FTS
- Vercel API routes with pagination and result caps
- No production corpus, no secrets, no copy of `src/data` from the live repo

## Privacy boundary

| Stays in the browser | May live on the server |
|---|---|
| MCQ answers, scores, flashcards, user notes | Published metadata, topic summaries, selected analysis |
| Local drafts | Official source links, selected documents |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Local mode uses fixtures only. No Supabase required.

```bash
npm test
npm run lint
npm run build
```

## Remote mode (optional)

1. Create a free Supabase project.
2. Run `database/migrations/001_init.sql`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Vercel.
4. Set `VITE_CONTENT_BACKEND=remote` for the frontend.

Do not commit credentials.

## What we will not do

- Touch `coolnaveen99/codepackr-law`
- Import the live topic/judgment corpus into this Git repo
- Put `DATABASE_URL` or service keys in source
- Expose an unrestricted export endpoint
- Send student practice data to any server
