create table if not exists public.performance_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mt5_connection_id uuid references public.mt5_connections(id) on delete cascade,
  name text not null default 'Default monthly plan',
  monthly_profit_target_percent numeric(6,2) not null default 6 check (monthly_profit_target_percent >= 0),
  max_monthly_loss_percent numeric(6,2) not null default 6 check (max_monthly_loss_percent >= 0),
  max_trades_per_month integer not null default 10 check (max_trades_per_month >= 0),
  target_win_rate_percent numeric(5,2) not null default 40 check (target_win_rate_percent between 0 and 100),
  target_rr numeric(6,2) not null default 3 check (target_rr >= 0),
  risk_per_trade_percent numeric(5,2) not null default 1 check (risk_per_trade_percent >= 0),
  max_losses_per_month integer not null default 6 check (max_losses_per_month >= 0),
  max_losing_streak integer not null default 3 check (max_losing_streak >= 0),
  max_daily_loss_percent numeric(6,2) not null default 3 check (max_daily_loss_percent >= 0),
  min_review_completion_percent numeric(5,2) not null default 80 check (min_review_completion_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists performance_plans_user_id_idx on public.performance_plans(user_id);
create index if not exists performance_plans_connection_idx on public.performance_plans(user_id, mt5_connection_id);
create unique index if not exists performance_plans_default_unique
  on public.performance_plans(user_id)
  where mt5_connection_id is null;
create unique index if not exists performance_plans_connection_unique
  on public.performance_plans(user_id, mt5_connection_id)
  where mt5_connection_id is not null;

drop trigger if exists set_performance_plans_updated_at on public.performance_plans;
create trigger set_performance_plans_updated_at
  before update on public.performance_plans
  for each row execute function public.set_updated_at();

alter table public.performance_plans enable row level security;

drop policy if exists "Performance plans are self-owned" on public.performance_plans;
create policy "Performance plans are self-owned" on public.performance_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.performance_plans (user_id)
select id
from public.profiles
where not exists (
  select 1
  from public.performance_plans
  where performance_plans.user_id = profiles.id
    and performance_plans.mt5_connection_id is null
);
