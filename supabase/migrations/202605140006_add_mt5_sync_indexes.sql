create unique index if not exists trades_user_mt5_identity_unique
  on public.trades(user_id, mt5_account, mt5_ticket)
  where mt5_account is not null and mt5_ticket is not null;

create index if not exists mt5_connections_api_key_hash_idx
  on public.mt5_connections(api_key_hash)
  where is_active = true;
