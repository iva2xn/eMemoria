-- ============================================================
-- Migration 009: payment_info
-- Singleton table storing editable GCash and bank transfer
-- details displayed on the billing page and admin overview.
--
-- GCash QR image is stored in Supabase Storage under the
-- fixed path  payment-info/gcash-qr.<ext>
-- Uploading a new QR always upserts that same path so the
-- bucket never accumulates stale files.
-- ============================================================

-- ── Table ────────────────────────────────────────────────────
create table public.payment_info (
  id                  int             primary key default 1,   -- enforces singleton
  -- GCash
  gcash_name          text            not null default '',
  gcash_number        text            not null default '',
  gcash_qr_path       text,           -- Storage path, e.g. payment-info/gcash-qr.png

  -- Bank accounts (up to 4)
  bank1_name          text            not null default '',
  bank1_account_name  text            not null default '',
  bank1_account_number text           not null default '',

  bank2_name          text            not null default '',
  bank2_account_name  text            not null default '',
  bank2_account_number text           not null default '',

  bank3_name          text            not null default '',
  bank3_account_name  text            not null default '',
  bank3_account_number text           not null default '',

  bank4_name          text            not null default '',
  bank4_account_name  text            not null default '',
  bank4_account_number text           not null default '',

  updated_at          timestamptz     not null default now(),

  -- Hard-lock to a single row
  constraint payment_info_singleton check (id = 1)
);

-- Seed the one and only row so it always exists
insert into public.payment_info (id) values (1)
  on conflict (id) do nothing;

-- Keep updated_at current on every edit
create trigger payment_info_updated_at
  before update on public.payment_info
  for each row execute procedure public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.payment_info enable row level security;

-- Everyone (including guests) can read payment details
create policy "Anyone can read payment info"
  on public.payment_info for select
  using (true);

-- Only admins can update
create policy "Admins can update payment info"
  on public.payment_info for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Storage bucket ───────────────────────────────────────────
-- Public bucket so the QR image can be rendered without auth.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-info',
  'payment-info',
  true,
  5242880,          -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Anyone can read (QR is public)
create policy "Public read payment-info bucket"
  on storage.objects for select
  using (bucket_id = 'payment-info');

-- Only admins can upload / replace / delete
create policy "Admins can upload payment-info"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-info'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update payment-info"
  on storage.objects for update
  using (
    bucket_id = 'payment-info'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can delete payment-info"
  on storage.objects for delete
  using (
    bucket_id = 'payment-info'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
