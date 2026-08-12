-- Allow admins to update any profile's role via the client
create policy if not exists "Admins can update any profile role"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (true);
