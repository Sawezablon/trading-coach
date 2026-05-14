alter table public.trading_rules
add column if not exists allowed_pairs text[] not null default '{}',
add column if not exists allowed_directions text[] not null default array['long', 'short'],
add column if not exists require_screenshot boolean not null default false,
add column if not exists strict_mode boolean not null default false;

alter table public.trades
add column if not exists checklist_results jsonb not null default '[]',
add column if not exists passed_rules text[] not null default '{}',
add column if not exists failed_rules text[] not null default '{}',
add column if not exists checklist_completion_rate integer not null default 0 check (checklist_completion_rate between 0 and 100),
add column if not exists discipline_score integer not null default 0 check (discipline_score between 0 and 100);
