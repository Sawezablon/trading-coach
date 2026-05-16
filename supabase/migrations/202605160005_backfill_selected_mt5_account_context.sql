with account_trade_counts as (
  select
    connection.id,
    connection.user_id,
    connection.last_sync_at,
    connection.created_at,
    count(trade.id) as trade_count
  from public.mt5_connections as connection
  left join public.trades as trade
    on trade.mt5_connection_id = connection.id
  where connection.is_active = true
  group by connection.id, connection.user_id, connection.last_sync_at, connection.created_at
),
ranked_accounts as (
  select
    *,
    row_number() over (
      partition by user_id
      order by trade_count desc, last_sync_at desc nulls last, created_at desc
    ) as row_number
  from account_trade_counts
)
update public.profiles as profile
set selected_mt5_connection_id = ranked.id
from ranked_accounts as ranked
where profile.id = ranked.user_id
  and profile.selected_mt5_connection_id is null
  and ranked.row_number = 1;
