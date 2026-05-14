alter table public.trades
  add column if not exists trade_timezone text not null default 'UTC';
