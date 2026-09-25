# Scripts

No live-repo write scripts live here on purpose.

When an exporter is added, it must:

1. Read a local checkout of `codepackr-law` that the developer already has
2. Write canonical JSON to disk or Supabase
3. Never `git push` to `codepackr-law`
4. Never commit exported full text into `cp-as-2`
