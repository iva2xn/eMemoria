-- ============================================================
-- Migration 001: profiles
-- Extends Supabase auth.users with app-level user data.
-- ============================================================

create type public.user_role as enum ('client', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null,
  email       text        not null unique,
  role        user_role   not null default 'client',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create a security definer function to check if the user is an admin
-- (runs as creator, bypassing RLS to avoid infinite recursion)
create or replace function public.is_admin()
returns boolean
security definer
language plpgsql
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());


