-- ============================================================
-- Migration 006: obituaries
-- Obituary records with image stored in Supabase Storage.
-- ============================================================

create table public.obituaries (
  id              uuid        primary key default gen_random_uuid(),
  full_name       text        not null,
  birth_date      date,
  death_date      date,
  age             smallint,
  image_path      text        not null, -- Supabase Storage path: obituaries/{id}.png
  is_published    boolean     not null default true,
  created_by      uuid        references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index obituaries_published_idx on public.obituaries (is_published, created_at desc);

create trigger obituaries_updated_at
  before update on public.obituaries
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.obituaries enable row level security;

create policy "Anyone can view published obituaries"
  on public.obituaries for select
  using (is_published = true);

create policy "Admins can manage all obituaries"
  on public.obituaries for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
