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
  selected_mt5_connection_id uuid,
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
  allowed_pairs text[] not null default '{}',
  allowed_directions text[] not null default array['long', 'short'],
  confirmation_required boolean not null default true,
  require_screenshot boolean not null default false,
  max_trades_per_day integer not null default 3 check (max_trades_per_day > 0),
  strict_mode boolean not null default false,
  custom_rules text[] not null default '{}',
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
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  risk_percent numeric(5,2) not null check (risk_percent >= 0),
  rr numeric(6,2) not null check (rr >= 0),
  session text not null,
  emotions text not null,
  notes text not null,
  confirmation boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed')),
  outcome text not null default 'pending' check (outcome in ('pending', 'win', 'loss', 'breakeven')),
  closed_at timestamptz,
  close_price numeric,
  profit_loss_percent numeric,
  profit_loss_amount numeric,
  final_rr numeric,
  closing_notes text,
  review_status text not null default 'reviewed' check (review_status in ('needs_review', 'reviewed')),
  review_completed_at timestamptz,
  lot_size numeric,
  commission numeric,
  swap numeric,
  account_balance_at_sync numeric,
  account_equity_at_sync numeric,
  account_currency text,
  symbol_tick_value numeric,
  symbol_tick_size numeric,
  symbol_contract_size numeric,
  symbol_point numeric,
  symbol_digits integer,
  estimated_risk_amount numeric,
  estimated_risk_percent numeric,
  risk_calculation_method text,
  screenshot_url text,
  checklist_results jsonb not null default '[]',
  passed_rules text[] not null default '{}',
  failed_rules text[] not null default '{}',
  checklist_completion_rate integer not null default 0 check (checklist_completion_rate between 0 and 100),
  discipline_score integer not null default 0 check (discipline_score between 0 and 100),
  trade_taken_at timestamptz not null,
  trade_timezone text not null default 'UTC',
  mt5_ticket text,
  mt5_account text,
  mt5_broker text,
  mt5_connection_id uuid,
  synced_from_mt5 boolean not null default false,
  last_synced_at timestamptz,
  mt5_raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_status_outcome_check check (
    (status = 'open' and outcome = 'pending')
    or (status = 'closed' and outcome in ('win', 'loss', 'breakeven'))
  )
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

create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  api_key_hash text not null,
  account_number text,
  broker text,
  account_nickname text not null default 'MT5 Account',
  prop_firm text,
  last_sync_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mt5_sync_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mt5_connection_id uuid references public.mt5_connections(id) on delete set null,
  account_number text,
  lookback_days integer not null default 365 check (lookback_days > 0),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trades
  drop constraint if exists trades_mt5_connection_id_fkey;

alter table public.trades
  add constraint trades_mt5_connection_id_fkey
  foreign key (mt5_connection_id) references public.mt5_connections(id) on delete set null;

alter table public.profiles
  drop constraint if exists profiles_selected_mt5_connection_id_fkey;

alter table public.profiles
  add constraint profiles_selected_mt5_connection_id_fkey
  foreign key (selected_mt5_connection_id) references public.mt5_connections(id) on delete set null;

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists trading_rules_user_id_idx on public.trading_rules(user_id);
create index if not exists trades_user_created_idx on public.trades(user_id, created_at desc);
create index if not exists trades_user_trade_taken_idx on public.trades(user_id, trade_taken_at desc);
create index if not exists trades_user_status_idx on public.trades(user_id, status);
create index if not exists trades_user_review_status_idx on public.trades(user_id, review_status);
create index if not exists trades_user_pair_idx on public.trades(user_id, pair);
create index if not exists trades_user_outcome_idx on public.trades(user_id, outcome);
create index if not exists trades_user_mt5_ticket_idx on public.trades(user_id, mt5_ticket) where mt5_ticket is not null;
create index if not exists trades_user_synced_from_mt5_idx on public.trades(user_id, synced_from_mt5);
create index if not exists trades_user_mt5_connection_idx on public.trades(user_id, mt5_connection_id) where mt5_connection_id is not null;
create unique index if not exists trades_user_mt5_connection_ticket_unique on public.trades(user_id, mt5_connection_id, mt5_ticket) where mt5_connection_id is not null and mt5_ticket is not null;
create index if not exists ai_analysis_user_created_idx on public.ai_analysis(user_id, created_at desc);
create index if not exists ai_analysis_trade_id_idx on public.ai_analysis(trade_id);
create index if not exists profiles_selected_mt5_connection_idx on public.profiles(selected_mt5_connection_id) where selected_mt5_connection_id is not null;
create index if not exists mt5_connections_user_id_idx on public.mt5_connections(user_id);
create index if not exists mt5_connections_user_active_idx on public.mt5_connections(user_id, is_active);
create index if not exists mt5_connections_user_broker_idx on public.mt5_connections(user_id, broker);
create index if not exists mt5_connections_user_prop_firm_idx on public.mt5_connections(user_id, prop_firm);
create index if not exists mt5_connections_api_key_hash_idx on public.mt5_connections(api_key_hash) where is_active = true;
create unique index if not exists mt5_connections_active_api_key_hash_unique on public.mt5_connections(api_key_hash) where is_active = true;
create unique index if not exists mt5_connections_active_account_broker_unique on public.mt5_connections(user_id, account_number, broker) where is_active = true and account_number is not null and broker is not null;
create index if not exists mt5_sync_requests_user_created_idx on public.mt5_sync_requests(user_id, created_at desc);
create index if not exists mt5_sync_requests_connection_status_idx on public.mt5_sync_requests(mt5_connection_id, status, created_at desc);
create unique index if not exists mt5_sync_requests_one_pending_per_connection_idx on public.mt5_sync_requests(mt5_connection_id) where mt5_connection_id is not null and status = 'pending';

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

drop trigger if exists set_mt5_connections_updated_at on public.mt5_connections;
create trigger set_mt5_connections_updated_at
  before update on public.mt5_connections
  for each row execute function public.set_updated_at();

drop trigger if exists set_mt5_sync_requests_updated_at on public.mt5_sync_requests;
create trigger set_mt5_sync_requests_updated_at
  before update on public.mt5_sync_requests
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.trading_rules enable row level security;
alter table public.trades enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.mt5_connections enable row level security;
alter table public.mt5_sync_requests enable row level security;

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

drop policy if exists "MT5 connections are self-owned" on public.mt5_connections;
create policy "MT5 connections are self-owned" on public.mt5_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "MT5 sync requests are self-owned" on public.mt5_sync_requests;
create policy "MT5 sync requests are self-owned" on public.mt5_sync_requests
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
