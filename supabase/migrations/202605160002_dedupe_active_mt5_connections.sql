with connection_counts as (
  select
    connection.id,
    connection.user_id,
    connection.account_number,
    connection.broker,
    connection.last_sync_at,
    connection.updated_at,
    count(trade.id) as trade_count
  from public.mt5_connections as connection
  left join public.trades as trade
    on trade.mt5_connection_id = connection.id
  where connection.is_active = true
    and connection.account_number is not null
    and connection.broker is not null
  group by
    connection.id,
    connection.user_id,
    connection.account_number,
    connection.broker,
    connection.last_sync_at,
    connection.updated_at
),
ranked_connections as (
  select
    *,
    first_value(id) over (
      partition by user_id, account_number, broker
      order by trade_count desc, last_sync_at desc nulls last, updated_at desc
    ) as keep_id,
    row_number() over (
      partition by user_id, account_number, broker
      order by trade_count desc, last_sync_at desc nulls last, updated_at desc
    ) as row_number
  from connection_counts
),
duplicate_connections as (
  select id, keep_id
  from ranked_connections
  where row_number > 1
)
update public.mt5_sync_requests as request
set mt5_connection_id = duplicate.keep_id
from duplicate_connections as duplicate
where request.mt5_connection_id = duplicate.id;

with connection_counts as (
  select
    connection.id,
    connection.user_id,
    connection.account_number,
    connection.broker,
    connection.last_sync_at,
    connection.updated_at,
    count(trade.id) as trade_count
  from public.mt5_connections as connection
  left join public.trades as trade
    on trade.mt5_connection_id = connection.id
  where connection.is_active = true
    and connection.account_number is not null
    and connection.broker is not null
  group by
    connection.id,
    connection.user_id,
    connection.account_number,
    connection.broker,
    connection.last_sync_at,
    connection.updated_at
),
ranked_connections as (
  select
    *,
    first_value(id) over (
      partition by user_id, account_number, broker
      order by trade_count desc, last_sync_at desc nulls last, updated_at desc
    ) as keep_id,
    row_number() over (
      partition by user_id, account_number, broker
      order by trade_count desc, last_sync_at desc nulls last, updated_at desc
    ) as row_number
  from connection_counts
),
duplicate_connections as (
  select id, keep_id
  from ranked_connections
  where row_number > 1
)
update public.trades as trade
set mt5_connection_id = duplicate.keep_id
from duplicate_connections as duplicate
where trade.mt5_connection_id = duplicate.id
  and trade.mt5_ticket is not null
  and not exists (
    select 1
    from public.trades as existing_trade
    where existing_trade.user_id = trade.user_id
      and existing_trade.mt5_connection_id = duplicate.keep_id
      and existing_trade.mt5_ticket = trade.mt5_ticket
  );

with connection_counts as (
  select
    connection.id,
    connection.user_id,
    connection.account_number,
    connection.broker,
    connection.last_sync_at,
    connection.updated_at,
    count(trade.id) as trade_count
  from public.mt5_connections as connection
  left join public.trades as trade
    on trade.mt5_connection_id = connection.id
  where connection.is_active = true
    and connection.account_number is not null
    and connection.broker is not null
  group by
    connection.id,
    connection.user_id,
    connection.account_number,
    connection.broker,
    connection.last_sync_at,
    connection.updated_at
),
ranked_connections as (
  select
    *,
    row_number() over (
      partition by user_id, account_number, broker
      order by trade_count desc, last_sync_at desc nulls last, updated_at desc
    ) as row_number
  from connection_counts
)
update public.mt5_connections as connection
set is_active = false
from ranked_connections as ranked
where connection.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists mt5_connections_active_account_broker_unique
  on public.mt5_connections(user_id, account_number, broker)
  where is_active = true and account_number is not null and broker is not null;
