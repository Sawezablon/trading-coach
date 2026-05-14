alter table public.trades
  add column if not exists trade_taken_at timestamptz;

update public.trades
set trade_taken_at = created_at
where trade_taken_at is null;

alter table public.trades
  alter column trade_taken_at set not null;

create index if not exists trades_user_trade_taken_idx
  on public.trades(user_id, trade_taken_at desc);
