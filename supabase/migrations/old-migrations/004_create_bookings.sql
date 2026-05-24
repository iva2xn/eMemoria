-- ============================================================
-- Migration 004: bookings
-- Memorial service package reservations.
-- ============================================================

create type public.booking_status as enum ('pending', 'active', 'completed', 'cancelled');

create table public.bookings (
  id              uuid            primary key default gen_random_uuid(),
  user_id         uuid            not null references public.profiles (id) on delete cascade,
  package_name    text            not null,
  price           numeric(10,2)   not null,
  status          booking_status  not null default 'pending',
  notes           text,
  created_at      timestamptz     not null default now(),
  updated_at      timestamptz     not null default now()
);

create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_status_idx  on public.bookings (status);

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.bookings enable row level security;

create policy "Users can view their own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy "Users can create bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all bookings"
  on public.bookings for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update all bookings"
  on public.bookings for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
