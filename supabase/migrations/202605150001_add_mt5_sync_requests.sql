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

create index if not exists mt5_sync_requests_user_created_idx
  on public.mt5_sync_requests(user_id, created_at desc);

create index if not exists mt5_sync_requests_connection_status_idx
  on public.mt5_sync_requests(mt5_connection_id, status, created_at desc);

create unique index if not exists mt5_sync_requests_one_pending_per_user_idx
  on public.mt5_sync_requests(user_id)
  where status = 'pending';

drop trigger if exists set_mt5_sync_requests_updated_at on public.mt5_sync_requests;
create trigger set_mt5_sync_requests_updated_at
  before update on public.mt5_sync_requests
  for each row execute function public.set_updated_at();

alter table public.mt5_sync_requests enable row level security;

drop policy if exists "MT5 sync requests are self-owned" on public.mt5_sync_requests;
create policy "MT5 sync requests are self-owned" on public.mt5_sync_requests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
