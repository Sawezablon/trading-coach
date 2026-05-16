with active_connections as (
  select id, user_id, account_number, broker
  from public.mt5_connections
  where is_active = true
    and account_number is not null
    and broker is not null
),
inactive_duplicates as (
  select
    inactive.id,
    active.id as active_id
  from public.mt5_connections as inactive
  inner join active_connections as active
    on active.user_id = inactive.user_id
    and active.account_number = inactive.account_number
    and active.broker = inactive.broker
  where inactive.is_active = false
)
update public.mt5_sync_requests as request
set mt5_connection_id = duplicate.active_id
from inactive_duplicates as duplicate
where request.mt5_connection_id = duplicate.id;

with active_connections as (
  select id, user_id, account_number, broker
  from public.mt5_connections
  where is_active = true
    and account_number is not null
    and broker is not null
),
inactive_duplicates as (
  select
    inactive.id,
    active.id as active_id
  from public.mt5_connections as inactive
  inner join active_connections as active
    on active.user_id = inactive.user_id
    and active.account_number = inactive.account_number
    and active.broker = inactive.broker
  where inactive.is_active = false
)
update public.trades as trade
set mt5_connection_id = duplicate.active_id
from inactive_duplicates as duplicate
where trade.mt5_connection_id = duplicate.id
  and trade.mt5_ticket is not null
  and not exists (
    select 1
    from public.trades as existing_trade
    where existing_trade.user_id = trade.user_id
      and existing_trade.mt5_connection_id = duplicate.active_id
      and existing_trade.mt5_ticket = trade.mt5_ticket
  );
