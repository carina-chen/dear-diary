-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Journal Entries ──────────────────────────────────────────────────────────
create table entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  mood int2 not null default 5,
  energy int2 not null default 5,
  theme text,
  what_happened text,
  emotions text,
  triggers text,
  gratitude text,
  reframe text,
  unresolved text,
  passage text,
  key_verse text,
  life_connection text,
  action text,
  closing text,
  ai_verses jsonb default '[]',
  tone text,
  tone_reason text,
  clarity_moment text,
  carryover_result text,
  carryover_note text,
  carryover_action text,
  saved_at timestamptz default now(),
  unique(user_id, date)
);

-- ── Weekly Reflections ───────────────────────────────────────────────────────
create table weekly_reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_of text not null,
  data jsonb not null default '{}',
  saved_at timestamptz default now(),
  unique(user_id, week_of)
);

-- ── Monthly Reflections ──────────────────────────────────────────────────────
create table monthly_reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null,
  data jsonb not null default '{}',
  saved_at timestamptz default now(),
  unique(user_id, month)
);

-- ── Clarity Moments ──────────────────────────────────────────────────────────
create table clarity_moments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  text text not null,
  saved_at timestamptz default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table entries enable row level security;
alter table weekly_reflections enable row level security;
alter table monthly_reflections enable row level security;
alter table clarity_moments enable row level security;

create policy "Users can manage their own entries"
  on entries for all using (auth.uid() = user_id);

create policy "Users can manage their own weekly reflections"
  on weekly_reflections for all using (auth.uid() = user_id);

create policy "Users can manage their own monthly reflections"
  on monthly_reflections for all using (auth.uid() = user_id);

create policy "Users can manage their own clarity moments"
  on clarity_moments for all using (auth.uid() = user_id);
