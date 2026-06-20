alter table public.mt5_connections
  add column if not exists account_net_funding numeric;
