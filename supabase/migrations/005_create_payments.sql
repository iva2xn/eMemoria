-- ============================================================
-- Migration 005: payments
-- Payment submissions (GCash, bank transfer, cash).
-- ============================================================

create type public.payment_status as enum ('pending', 'approved', 'rejected');
create type public.payment_method as enum ('gcash', 'bdo_bank', 'bpi_bank', 'cash');

create table public.payments (
  id                  uuid            primary key default gen_random_uuid(),
  user_id             uuid            not null references public.profiles (id) on delete cascade,
  booking_id          uuid            references public.bookings (id) on delete set null,

  -- What was paid for
  product_type        text            not null, -- 'columbarium', 'package', 'cash'
  product_ref         text,                     -- slot code or package name

  -- Payment details
  method              payment_method  not null,
  reference_number    text,
  amount              numeric(10,2)   not null check (amount > 0),
  receipt_file_path   text,           -- Supabase Storage path

  -- Status
  status              payment_status  not null default 'pending',
  notes               text,
  approved_by         uuid            references public.profiles (id) on delete set null,
  approved_at         timestamptz,

  created_at          timestamptz     not null default now(),
  updated_at          timestamptz     not null default now()
);

create index payments_user_id_idx   on public.payments (user_id);
create index payments_status_idx    on public.payments (status);
create index payments_booking_id_idx on public.payments (booking_id);

create trigger payments_updated_at
  before update on public.payments
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.payments enable row level security;

create policy "Users can view their own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Users can submit payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update payment status"
  on public.payments for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
