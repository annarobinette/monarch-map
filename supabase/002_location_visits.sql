-- Where Monarchs Lie: "I've visited" tracking for locations
-- Run this once in the Supabase SQL Editor (after schema_and_seed.sql).

create table if not exists location_visits (
    id bigint generated always as identity primary key,
    location_id text references locations(location_id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade not null,
    visited_at timestamptz not null default now(),
    unique (location_id, user_id)
);

alter table location_visits enable row level security;

drop policy if exists "public read visits" on location_visits;
create policy "public read visits" on location_visits for select using (true);

drop policy if exists "insert own visit" on location_visits;
create policy "insert own visit" on location_visits for insert with check (auth.uid() = user_id);

drop policy if exists "update own visit" on location_visits;
create policy "update own visit" on location_visits for update using (auth.uid() = user_id);

drop policy if exists "delete own visit" on location_visits;
create policy "delete own visit" on location_visits for delete using (auth.uid() = user_id);
