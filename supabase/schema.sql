create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  max_risk_percent numeric(5,2) not null default 1.00 check (max_risk_percent > 0),
  min_rr numeric(6,2) not null default 2.00 check (min_rr > 0),
  allowed_sessions text[] not null default array['London'],
  confirmation_required boolean not null default true,
  max_trades_per_day integer not null default 3 check (max_trades_per_day > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trading_rules_user_unique unique (user_id)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pair text not null,
  direction text not null default 'long' check (direction in ('long', 'short')),
  risk_percent numeric(5,2) not null check (risk_percent >= 0),
  rr numeric(6,2) not null check (rr >= 0),
  session text not null,
  emotions text not null,
  notes text not null,
  confirmation boolean not null default false,
  outcome text not null default 'open' check (outcome in ('win', 'loss', 'breakeven', 'open')),
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists trading_rules_user_id_idx on public.trading_rules(user_id);
create index if not exists trades_user_created_idx on public.trades(user_id, created_at desc);
create index if not exists trades_user_pair_idx on public.trades(user_id, pair);
create index if not exists trades_user_outcome_idx on public.trades(user_id, outcome);
create index if not exists ai_analysis_user_created_idx on public.ai_analysis(user_id, created_at desc);
create index if not exists ai_analysis_trade_id_idx on public.ai_analysis(trade_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_trading_rules_updated_at on public.trading_rules;
create trigger set_trading_rules_updated_at
  before update on public.trading_rules
  for each row execute function public.set_updated_at();

drop trigger if exists set_trades_updated_at on public.trades;
create trigger set_trades_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

drop trigger if exists set_ai_analysis_updated_at on public.ai_analysis;
create trigger set_ai_analysis_updated_at
  before update on public.ai_analysis
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.trading_rules enable row level security;
alter table public.trades enable row level security;
alter table public.ai_analysis enable row level security;

drop policy if exists "Profiles are self-owned" on public.profiles;
create policy "Profiles are self-owned" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Trading rules are self-owned" on public.trading_rules;
create policy "Trading rules are self-owned" on public.trading_rules
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Trades are self-owned" on public.trades;
create policy "Trades are self-owned" on public.trades
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "AI analysis is self-owned" on public.ai_analysis;
create policy "AI analysis is self-owned" on public.ai_analysis
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name;

  insert into public.trading_rules (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('chart-screenshots', 'chart-screenshots', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users can upload chart screenshots" on storage.objects;
create policy "Users can upload chart screenshots" on storage.objects
  for insert
  with check (
    bucket_id = 'chart-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can view own chart screenshots" on storage.objects;
create policy "Users can view own chart screenshots" on storage.objects
  for select
  using (
    bucket_id = 'chart-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
