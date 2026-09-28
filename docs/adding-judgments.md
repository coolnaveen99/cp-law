# Adding Future Judgments to cp-law

This guide documents how to add, curate, and publish new Indian landmark judgments into the `cp-law` database without bloating Git.

---

## The Rule: Corpus Outside Git

- **Do NOT** create large TypeScript arrays or commit raw case data into Git.
- **Do** author cases in the local `staging/` directory (which is in `.gitignore`).
- **Do** publish cases directly to Supabase using the built-in ingestion scripts.

---

## 1. Quick Start: Adding a Single Case

### Step 1: Initialize a Case Template
Run:
```bash
npm run case:init shreya-singhal-2015
```
This automatically creates a pre-populated template at `staging/shreya-singhal-2015.json` with the canonical schema.

### Step 2: Edit the JSON Brief
Open `staging/shreya-singhal-2015.json` and fill in the details:
- **Level-1 Metadata**: `caseName`, `year`, `citation`, `court`, `topics`, `provisions`.
- **Level-2 Analysis**: `ratioDecidendi`, `holding`, `facts`, `issues`, `reasoning` (heading + explanation), `examPoints`, `bench`, `judges`.

### Step 3: Validate with a Dry Run
```bash
npm run staging:dry
```
This validates required fields, dates, ID formats, and prints what will be upserted.

### Step 4: Publish to Supabase
```bash
npm run staging:ingest
```
This upserts the case into:
- `judgment_index` (searchable metadata)
- `judgment_analysis` (deep brief)
- `topic_index` (linked topics)

---

## 2. Ingesting Multiple Cases at Once

You can place multiple JSON files in `staging/`:
```
staging/
├── navtej-johar-2018.json
├── joseph-shine-2018.json
└── anuradha-bhasin-2020.json
```

1. **Test all cases:**
   ```bash
   npm run staging:dry
   ```
2. **Publish all valid cases:**
   ```bash
   npm run staging:ingest
   ```

---

## 3. Schema Reference

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | `string` | Canonical slug (`<name>-<year>`) | `"shreya-singhal-2015"` |
| `caseName` | `string` | Official party names | `"Shreya Singhal v. Union of India"` |
| `court` | `string` | Court name | `"Supreme Court of India"` |
| `year` | `number` | 4-digit decision year | `2015` |
| `citation` | `string` | Primary law report citation | `"(2015) 5 SCC 1"` |
| `topics` | `string[]` | Array of topic tags | `["freedom-of-speech", "cyber-law"]` |
| `provisions` | `array` | Act and article/section | `[{"actName": "IT Act", "section": "66A"}]` |
| `facts` | `string[]` | Key material facts | `["Arrests made under Sec 66A..."]` |
| `issues` | `string[]` | Legal questions framed | `["Whether Sec 66A violates Art 19(1)(a)..."]` |
| `holding` | `string` | Core outcome | `"Section 66A declared unconstitutional."` |
| `ratioDecidendi` | `string` | Binding legal principle | `"Distinction between discussion and incitement..."` |
| `reasoning` | `array` | Structured arguments | `[{"heading": "Overbreadth", "explanation": "..."}]` |
| `examPoints` | `string[]` | High-yield revision points | `["Landmark on Internet freedom", "..."]` |

---

## 4. Verifying in the App

Once published, you can immediately test the case live:
- In the search bar: type the case name or citation.
- Direct URL: `https://<your-app-domain>/?judgment=<canonical-id>`
- API endpoint: `https://<your-app-domain>/api/judgments?id=<canonical-id>`
