-- CP-AS-2 Level-1 index. Do not store full PDFs or OCR here.

create extension if not exists pg_trgm;

create table if not exists judgment_index (
  id text primary key,
  case_name text not null,
  court text not null,
  court_level text not null,
  judgment_date date not null,
  year integer not null,
  citation text not null,
  citation_normalized text not null,
  topics text[] not null default '{}',
  sections text[] not null default '{}',
  keywords text[] not null default '{}',
  short_summary text not null,
  source_reference text not null,
  source_url text,
  document_available boolean not null default false,
  analysis_available boolean not null default false,
  status text not null default 'draft',
  checksum text,
  search_document tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(case_name, '') || ' ' ||
      coalesce(citation, '') || ' ' ||
      coalesce(citation_normalized, '') || ' ' ||
      coalesce(short_summary, '') || ' ' ||
      coalesce(array_to_string(keywords, ' '), '')
    )
  ) stored
);

create index if not exists judgment_index_fts on judgment_index using gin (search_document);
create index if not exists judgment_index_citation_trgm on judgment_index using gin (citation_normalized gin_trgm_ops);
create index if not exists judgment_index_year on judgment_index (year);
create index if not exists judgment_index_status on judgment_index (status);

create table if not exists judgment_analysis (
  id text primary key references judgment_index(id) on delete cascade,
  ratio text not null,
  legal_principle text not null,
  issues text[] not null default '{}',
  arguments text[] not null default '{}',
  decision text not null,
  important_sections text[] not null default '{}',
  related_cases text[] not null default '{}'
);

create table if not exists topic_index (
  id text primary key,
  subject text not null,
  title text not null,
  short_summary text not null,
  related_judgment_ids text[] not null default '{}',
  related_canonical_ids text[] not null default '{}',
  status text not null default 'draft'
);

alter table judgment_index enable row level security;
alter table judgment_analysis enable row level security;
alter table topic_index enable row level security;

create policy published_judgments_read on judgment_index
  for select using (status = 'published');

create policy published_topics_read on topic_index
  for select using (status = 'published');

create policy published_analysis_read on judgment_analysis
  for select using (
    exists (
      select 1 from judgment_index
      where judgment_index.id = judgment_analysis.id
        and judgment_index.status = 'published'
        and judgment_index.analysis_available = true
    )
  );
