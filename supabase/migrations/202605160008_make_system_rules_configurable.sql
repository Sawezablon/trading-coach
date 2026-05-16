alter table public.trading_rules
  drop constraint if exists trading_rules_max_risk_percent_check,
  drop constraint if exists trading_rules_min_rr_check,
  drop constraint if exists trading_rules_max_trades_per_day_check;

alter table public.trading_rules
  alter column max_risk_percent set default 0,
  alter column min_rr set default 0,
  alter column allowed_sessions set default '{}',
  alter column allowed_directions set default '{}',
  alter column max_trades_per_day set default 0,
  add column if not exists require_stop_loss boolean not null default true,
  add column if not exists require_take_profit boolean not null default true,
  add column if not exists check_emotional_state boolean not null default true,
  add constraint trading_rules_max_risk_percent_check check (max_risk_percent >= 0),
  add constraint trading_rules_min_rr_check check (min_rr >= 0),
  add constraint trading_rules_max_trades_per_day_check check (max_trades_per_day >= 0);
