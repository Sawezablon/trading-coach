alter table public.mt5_connections
  add column if not exists account_nickname text not null default 'MT5 Account',
  add column if not exists prop_firm text;

alter table public.mt5_connections
  drop constraint if exists mt5_connections_user_unique;

alter table public.trades
  add column if not exists mt5_connection_id uuid references public.mt5_connections(id) on delete set null;

update public.trades as trade
set mt5_connection_id = connection.id
from public.mt5_connections as connection
where trade.mt5_connection_id is null
  and trade.user_id = connection.user_id
  and trade.mt5_account is not null
  and connection.account_number = trade.mt5_account;

update public.mt5_connections
set account_nickname = coalesce(nullif(account_nickname, ''), account_number, broker, 'MT5 Account');

drop index if exists public.trades_user_mt5_identity_unique;
create unique index if not exists trades_user_mt5_connection_ticket_unique
  on public.trades(user_id, mt5_connection_id, mt5_ticket)
  where mt5_connection_id is not null and mt5_ticket is not null;

drop index if exists public.mt5_sync_requests_one_pending_per_user_idx;
create unique index if not exists mt5_sync_requests_one_pending_per_connection_idx
  on public.mt5_sync_requests(mt5_connection_id)
  where mt5_connection_id is not null and status = 'pending';

create index if not exists trades_user_mt5_connection_idx
  on public.trades(user_id, mt5_connection_id)
  where mt5_connection_id is not null;

create index if not exists mt5_connections_user_active_idx
  on public.mt5_connections(user_id, is_active);

create index if not exists mt5_connections_user_broker_idx
  on public.mt5_connections(user_id, broker);

create index if not exists mt5_connections_user_prop_firm_idx
  on public.mt5_connections(user_id, prop_firm);

create unique index if not exists mt5_connections_active_api_key_hash_unique
  on public.mt5_connections(api_key_hash)
  where is_active = true;
