alter table public.trades
  add column if not exists system_analysis jsonb;

create index if not exists trades_user_system_analysis_idx
  on public.trades using gin (system_analysis);
