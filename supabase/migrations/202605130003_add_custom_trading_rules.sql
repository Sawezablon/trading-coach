alter table public.trading_rules
add column if not exists custom_rules text[] not null default '{}';
