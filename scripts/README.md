# Scripts

## `export-to-supabase.ts`

One-way local exporter into Supabase. Does **not** write to `codepackr-law` and does **not** commit corpus into this repo.

### Requirements

1. `.env.local` in the repo root with:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. For live-library export: a local checkout of `codepackr-law`

### Commands

```bash
# Push built-in fixtures (safe smoke test)
npm run export:fixtures

# Dry-run against a local codepackr-law checkout
npm run export:law:dry -- --law-path ../codepackr-law --limit 20

# Real upsert (Level-1 index + analysis when available)
npm run export:law -- --law-path ../codepackr-law --limit 50

# Full available set (can be large — start with --limit)
npx tsx scripts/export-to-supabase.ts --from codepackr-law --law-path ../codepackr-law --publish
```

### Flags

| Flag | Meaning |
|------|---------|
| `--from fixtures\|codepackr-law` | Source |
| `--law-path <dir>` | Local `codepackr-law` root |
| `--limit <n>` | Max judgments |
| `--publish` | Force `status=published` |
| `--no-analysis` | Skip `judgment_analysis` |
| `--dry-run` | Print counts only |

### Rules

1. Read a local checkout of `codepackr-law` the developer already has
2. Write canonical rows to Supabase (or dry-run)
3. Never `git push` to `codepackr-law`
4. Never commit exported full text into `cp-law`
