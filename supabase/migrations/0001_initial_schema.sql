-- 放射線技師ナレッジノート 初期スキーマ
-- Supabase SQL Editor または CLI で一度だけ適用する。

create extension if not exists pgcrypto;

create table public.app_allowed_users (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.app_allowed_users enable row level security;
revoke all on public.app_allowed_users from anon, authenticated;

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.app_allowed_users
      where email = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.is_allowed_user() from public;
grant execute on function public.is_allowed_user() to authenticated;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null unique default gen_random_uuid()::text,
  title text not null check (char_length(title) between 1 and 240),
  summary text not null default '',
  body text not null default '',
  modalities text[] not null default '{}',
  body_regions text[] not null default '{}',
  themes text[] not null default '{}',
  tags text[] not null default '{}',
  publication_status text not null default 'draft' check (publication_status in ('draft', 'published', 'archived')),
  verification_status text not null default 'self' check (verification_status in ('self', 'codex_verified', 'needs_review')),
  checked_at date,
  favorite boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.note_sources (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  publisher text,
  url text not null check (url ~* '^https?://'),
  source_type text not null default 'reference',
  published_at date,
  accessed_at date not null default current_date,
  used_for text,
  reliability text not null default 'reference' check (reliability in ('primary', 'peer_reviewed', 'official', 'reference', 'unverified')),
  created_at timestamptz not null default now()
);

create table public.note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  media_type text not null,
  source_page_url text check (source_page_url is null or source_page_url ~* '^https?://'),
  source_asset_url text check (source_asset_url is null or source_asset_url ~* '^https?://'),
  provider text,
  acquired_at date not null default current_date,
  rights_status text not null check (rights_status in ('reusable', 'private_unconfirmed', 'link_only', 'ai_generated')),
  license_terms text,
  is_ai_generated boolean not null default false,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (note_id, storage_path)
);

create table public.note_relations (
  note_id uuid not null references public.notes(id) on delete cascade,
  related_note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, related_note_id),
  check (note_id <> related_note_id)
);

create table public.note_versions (
  id bigint generated always as identity primary key,
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (note_id, version)
);

create index notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index notes_user_status_idx on public.notes (user_id, publication_status, verification_status);
create index note_sources_note_idx on public.note_sources (note_id);
create index note_attachments_note_idx on public.note_attachments (note_id, sort_order);
create index note_versions_note_idx on public.note_versions (note_id, version desc);

create or replace function public.capture_note_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.note_versions (note_id, user_id, version, snapshot)
  values (
    old.id,
    old.user_id,
    old.version,
    to_jsonb(old) - 'user_id'
  )
  on conflict (note_id, version) do nothing;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger notes_capture_version
before update on public.notes
for each row execute function public.capture_note_version();

alter table public.notes enable row level security;
alter table public.note_sources enable row level security;
alter table public.note_attachments enable row level security;
alter table public.note_relations enable row level security;
alter table public.note_versions enable row level security;

create policy notes_owner_all on public.notes
for all to authenticated
using (public.is_allowed_user() and user_id = auth.uid())
with check (public.is_allowed_user() and user_id = auth.uid());

create policy note_sources_owner_all on public.note_sources
for all to authenticated
using (
  public.is_allowed_user()
  and user_id = auth.uid()
  and exists (select 1 from public.notes where notes.id = note_sources.note_id and notes.user_id = auth.uid())
)
with check (
  public.is_allowed_user()
  and user_id = auth.uid()
  and exists (select 1 from public.notes where notes.id = note_sources.note_id and notes.user_id = auth.uid())
);

create policy note_attachments_owner_all on public.note_attachments
for all to authenticated
using (
  public.is_allowed_user()
  and user_id = auth.uid()
  and exists (select 1 from public.notes where notes.id = note_attachments.note_id and notes.user_id = auth.uid())
)
with check (
  public.is_allowed_user()
  and user_id = auth.uid()
  and exists (select 1 from public.notes where notes.id = note_attachments.note_id and notes.user_id = auth.uid())
);

create policy note_relations_owner_all on public.note_relations
for all to authenticated
using (
  public.is_allowed_user()
  and user_id = auth.uid()
  and exists (select 1 from public.notes where notes.id = note_relations.note_id and notes.user_id = auth.uid())
  and exists (select 1 from public.notes where notes.id = note_relations.related_note_id and notes.user_id = auth.uid())
)
with check (
  public.is_allowed_user()
  and user_id = auth.uid()
  and exists (select 1 from public.notes where notes.id = note_relations.note_id and notes.user_id = auth.uid())
  and exists (select 1 from public.notes where notes.id = note_relations.related_note_id and notes.user_id = auth.uid())
);

create policy note_versions_owner_select on public.note_versions
for select to authenticated
using (public.is_allowed_user() and user_id = auth.uid());

revoke all on public.notes, public.note_sources, public.note_attachments, public.note_relations, public.note_versions from anon;
grant select, insert, update, delete on public.notes, public.note_sources, public.note_attachments, public.note_relations to authenticated;
grant select on public.note_versions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy note_images_owner_select on storage.objects
for select to authenticated
using (
  bucket_id = 'note-images'
  and public.is_allowed_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy note_images_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'note-images'
  and public.is_allowed_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy note_images_owner_update on storage.objects
for update to authenticated
using (
  bucket_id = 'note-images'
  and public.is_allowed_user()
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'note-images'
  and public.is_allowed_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy note_images_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'note-images'
  and public.is_allowed_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);
