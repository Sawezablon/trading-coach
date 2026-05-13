create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  timezone text default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  start_time time,
  end_time time,
  timezone text default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  max_risk_percent numeric(5,2) not null default 1.00,
  min_rr numeric(5,2) not null default 2.00,
  allowed_sessions text[] not null default array['London'],
  confirmation_required boolean not null default true,
  max_trades_per_day integer not null default 3,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pair text not null,
  direction text check (direction in ('long', 'short')) default 'long',
  risk_percent numeric(5,2) not null,
  rr numeric(6,2) not null,
  session text not null,
  emotions text not null,
  notes text not null,
  confirmation boolean not null default false,
  outcome text check (outcome in ('win', 'loss', 'breakeven', 'open')) default 'open',
  screenshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_analysis (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  setup_quality_score integer not null check (setup_quality_score between 0 and 100),
  discipline_score integer not null check (discipline_score between 0 and 100),
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  detected_mistakes text[] not null default '{}',
  rule_violations text[] not null default '{}',
  emotional_observations text[] not null default '{}',
  improvement_suggestions text[] not null default '{}',
  recurring_mistakes text[] not null default '{}',
  model text not null default 'mock',
  created_at timestamptz not null default now()
);

create index if not exists trades_user_created_idx on public.trades(user_id, created_at desc);
create index if not exists ai_analysis_trade_idx on public.ai_analysis(trade_id);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.rules enable row level security;
alter table public.trades enable row level security;
alter table public.ai_analysis enable row level security;

create policy "Profiles are self-owned" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Sessions are self-owned" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Rules are self-owned" on public.rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Trades are self-owned" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Analysis is self-owned" on public.ai_analysis
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.rules (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.sessions (user_id, name, start_time, end_time, timezone)
  values
    (new.id, 'London', '07:00', '11:00', 'UTC'),
    (new.id, 'New York', '13:00', '17:00', 'UTC')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('chart-screenshots', 'chart-screenshots', true)
on conflict (id) do nothing;

create policy "Users can upload chart screenshots" on storage.objects
  for insert with check (bucket_id = 'chart-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own chart screenshots" on storage.objects
  for select using (bucket_id = 'chart-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
