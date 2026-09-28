# GitHub Copilot & AI Coding Agent Instructions: CP-AS-2 (cp-law)

You are operating on `cp-law`, the content and data platform for Indian legal education.

## Core Directives (NON-NEGOTIABLE)

1. **Architecture Split: Code in Git, Corpus in Supabase**
   - NEVER commit the legal judgment corpus into this Git repository.
   - Keep `src/data/fixtures` tiny (3-5 landmark cases max) strictly for unit testing.
   - All 300+ live judgments live in Supabase PostgreSQL (`judgment_index`, `judgment_analysis`, `topic_index`).

2. **Never Touch `coolnaveen99/codepackr-law` Directly**
   - `coolnaveen99/codepackr-law` is a distinct repo. Never commit or push directly to it from automated scripts.
   - Read-only clones of `codepackr-law` must be placed in `/tmp` and removed after batch jobs.

3. **Preserve Canonical Legal IDs**
   - Case IDs must follow lowercase alphanumeric slug convention: `<name>-<year>` (e.g. `kesavananda-bharati-1973`, `maneka-gandhi-1978`, `puttaswamy-2017`).
   - Never generate random UUIDs for judgments; legal citation stability is required.

4. **Zero Student Telemetry on Server**
   - Never send student practice data (MCQ responses, quiz scores, flashcard state, bookmarks) to any server.
   - Student state is 100% local-first (`localStorage` / `IndexedDB`).
   - The serverless API (`/api/*`) only serves public legal content and metadata.

5. **Data Layer Discipline**
   - Always extend `ContentRepository` (`src/services/repository.ts`) or `SupabaseContentRepository` for data access.
   - Do NOT add ad-hoc `fetch()` calls inside React UI components.
   - Search metadata at Level 1 (`judgment_index`); load full Level 2 case briefs (`judgment_analysis`) on-demand only when a case is opened.

6. **Adding New Judgments**
   - Use `npm run case:init <id>` to generate a staging template.
   - Use `npm run staging:dry` to validate schema.
   - Use `npm run staging:ingest` to publish to Supabase.
   - Staging files are gitignored (`staging/`) and must never be committed.
