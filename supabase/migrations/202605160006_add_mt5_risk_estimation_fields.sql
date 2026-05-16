alter table public.trades
  add column if not exists account_balance_at_sync numeric,
  add column if not exists account_equity_at_sync numeric,
  add column if not exists account_currency text,
  add column if not exists symbol_tick_value numeric,
  add column if not exists symbol_tick_size numeric,
  add column if not exists symbol_contract_size numeric,
  add column if not exists symbol_point numeric,
  add column if not exists symbol_digits integer,
  add column if not exists estimated_risk_amount numeric,
  add column if not exists estimated_risk_percent numeric,
  add column if not exists risk_calculation_method text;

create index if not exists trades_user_estimated_risk_idx
  on public.trades(user_id, estimated_risk_percent)
  where estimated_risk_percent is not null;
