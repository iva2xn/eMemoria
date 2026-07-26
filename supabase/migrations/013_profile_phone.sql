-- Add phone number to user profiles
alter table profiles
  add column if not exists phone text;
