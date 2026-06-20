alter table public.mt5_connections
  add column if not exists account_balance numeric,
  add column if not exists account_equity numeric,
  add column if not exists account_currency text;

with latest_snapshot as (
  select distinct on (trade.mt5_connection_id)
    trade.mt5_connection_id,
    trade.account_balance_at_sync,
    trade.account_equity_at_sync,
    trade.account_currency
  from public.trades as trade
  where trade.mt5_connection_id is not null
    and (
      trade.account_balance_at_sync is not null
      or trade.account_equity_at_sync is not null
      or trade.account_currency is not null
    )
  order by trade.mt5_connection_id, trade.last_synced_at desc nulls last, trade.updated_at desc
)
update public.mt5_connections as connection
set
  account_balance = snapshot.account_balance_at_sync,
  account_equity = snapshot.account_equity_at_sync,
  account_currency = snapshot.account_currency
from latest_snapshot as snapshot
where snapshot.mt5_connection_id = connection.id
  and connection.account_balance is null
  and connection.account_equity is null
  and connection.account_currency is null;
