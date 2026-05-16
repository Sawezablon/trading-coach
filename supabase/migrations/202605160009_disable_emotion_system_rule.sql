alter table public.trading_rules
  alter column check_emotional_state set default false;

update public.trading_rules
set check_emotional_state = false;
