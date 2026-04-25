-- SSCalendar Supabase Schema
-- Run this in your Supabase project → SQL Editor

create table if not exists stories (
  id          uuid primary key default gen_random_uuid(),
  day_key     text not null,          -- "2026-04-24"
  text        text not null default '',
  category    text not null default 'Lifestyle',
  posted      boolean not null default false,
  sort_order  integer not null default 0,
  created_by  text not null default '',
  edited_by   text not null default '',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Index for fast day lookups
create index if not exists stories_day_key_idx on stories(day_key);
create index if not exists stories_sort_order_idx on stories(day_key, sort_order);

-- Enable Row Level Security (open read/write for collaborative, no-auth use)
alter table stories enable row level security;

create policy "Allow all reads" on stories
  for select using (true);

create policy "Allow all inserts" on stories
  for insert with check (true);

create policy "Allow all updates" on stories
  for update using (true);

create policy "Allow all deletes" on stories
  for delete using (true);

-- Enable real-time for this table
alter publication supabase_realtime add table stories;
