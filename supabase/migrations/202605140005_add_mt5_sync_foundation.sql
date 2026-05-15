alter table public.trades
  add column if not exists mt5_ticket text,
  add column if not exists mt5_account text,
  add column if not exists mt5_broker text,
  add column if not exists synced_from_mt5 boolean not null default false,
  add column if not exists last_synced_at timestamptz,
  add column if not exists mt5_raw_data jsonb;

create table if not exists public.mt5_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  api_key_hash text not null,
  account_number text,
  broker text,
  last_sync_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mt5_connections_user_unique unique (user_id)
);

create index if not exists trades_user_mt5_ticket_idx
  on public.trades(user_id, mt5_ticket)
  where mt5_ticket is not null;

create index if not exists trades_user_synced_from_mt5_idx
  on public.trades(user_id, synced_from_mt5);

create index if not exists mt5_connections_user_id_idx
  on public.mt5_connections(user_id);

drop trigger if exists set_mt5_connections_updated_at on public.mt5_connections;
create trigger set_mt5_connections_updated_at
  before update on public.mt5_connections
  for each row execute function public.set_updated_at();

alter table public.mt5_connections enable row level security;

drop policy if exists "MT5 connections are self-owned" on public.mt5_connections;
create policy "MT5 connections are self-owned" on public.mt5_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
