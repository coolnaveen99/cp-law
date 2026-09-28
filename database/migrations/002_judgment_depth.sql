-- Widen judgment_analysis toward live-site depth (facts, reasoning, provisions, etc.)
-- Safe to run on existing DB that already has 001 tables.

alter table judgment_analysis
  add column if not exists facts text[] not null default '{}',
  add column if not exists holding text not null default '',
  add column if not exists reasoning jsonb not null default '[]'::jsonb,
  add column if not exists provisions jsonb not null default '[]'::jsonb,
  add column if not exists exam_points text[] not null default '{}',
  add column if not exists bench text,
  add column if not exists judges text[] not null default '{}',
  add column if not exists subject text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists appellant_args text[] not null default '{}',
  add column if not exists respondent_args text[] not null default '{}';

comment on column judgment_analysis.reasoning is
  'Array of {heading, explanation} objects';
comment on column judgment_analysis.provisions is
  'Array of {actName, article, section, title, provisionId} objects';
