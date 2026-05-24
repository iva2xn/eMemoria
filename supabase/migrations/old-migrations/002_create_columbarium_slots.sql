-- ============================================================
-- Migration 002: columbarium_slots
-- Persistent slot grid with occupant details for occupied slots.
-- ============================================================

create type public.slot_status as enum ('available', 'reserved', 'occupied');

create table public.columbarium_slots (
  id              uuid        primary key default gen_random_uuid(),

  -- Grid position
  row_number      smallint    not null check (row_number between 1 and 6),
  col_number      smallint    not null check (col_number between 1 and 12),
  slot_code       text        not null unique, -- e.g. "R1C03"

  -- Pricing
  price           numeric(10,2) not null,

  -- Status
  status          slot_status not null default 'available',

  -- Occupant details (populated when status = 'occupied')
  occupant_name       text,
  occupant_birth_date date,
  occupant_death_date date,
  occupant_age        smallint,
  occupant_photo_url  text,   -- Supabase Storage path
  occupant_notes      text,

  -- Reservation link (populated when status = 'reserved')
  reserved_by_user_id uuid references public.profiles (id) on delete set null,
  reserved_at         timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index columbarium_slots_grid_idx
  on public.columbarium_slots (row_number, col_number);

create trigger columbarium_slots_updated_at
  before update on public.columbarium_slots
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.columbarium_slots enable row level security;

create policy "Anyone can view slots"
  on public.columbarium_slots for select
  using (true);

create policy "Only admins can insert/update/delete slots"
  on public.columbarium_slots for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Seed: insert all 72 slots with correct prices ──────────────
do $$
declare
  r smallint;
  c smallint;
  price_map numeric(10,2)[];
  slot_code text;
begin
  -- Row prices: row 1=25000, row 2=35000, row 3=25000, row 4=20000, row 5=20000, row 6=20000
  price_map := array[25000, 35000, 25000, 20000, 20000, 20000];

  for r in 1..6 loop
    for c in 1..12 loop
      slot_code := 'R' || r || 'C' || lpad(c::text, 2, '0');
      insert into public.columbarium_slots (row_number, col_number, slot_code, price)
      values (r, c, slot_code, price_map[r]);
    end loop;
  end loop;
end;
$$;
