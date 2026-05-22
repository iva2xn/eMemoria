-- ============================================================
-- Migration 003: inquiries
-- Contact form submissions from families.
-- ============================================================

create table public.inquiries (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null,
  subject     text        not null,
  message     text        not null,
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.inquiries enable row level security;

create policy "Anyone can submit an inquiry"
  on public.inquiries for insert
  with check (true);

create policy "Only admins can read inquiries"
  on public.inquiries for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Only admins can update inquiries"
  on public.inquiries for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
