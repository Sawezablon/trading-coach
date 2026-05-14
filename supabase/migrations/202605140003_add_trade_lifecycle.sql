alter table public.trades
  add column if not exists status text not null default 'open',
  add column if not exists closed_at timestamptz,
  add column if not exists close_price numeric,
  add column if not exists profit_loss_percent numeric,
  add column if not exists profit_loss_amount numeric,
  add column if not exists final_rr numeric,
  add column if not exists closing_notes text,
  add column if not exists entry_price numeric,
  add column if not exists stop_loss numeric,
  add column if not exists take_profit numeric;

alter table public.trades
  drop constraint if exists trades_outcome_check,
  drop constraint if exists trades_status_check,
  drop constraint if exists trades_status_outcome_check;

update public.trades
set
  status = case when outcome = 'open' then 'open' else 'closed' end,
  outcome = case when outcome = 'open' then 'pending' else outcome end
where outcome = 'open' or status is null;

alter table public.trades
  add constraint trades_status_check check (status in ('open', 'closed')),
  add constraint trades_outcome_check check (outcome in ('pending', 'win', 'loss', 'breakeven')),
  add constraint trades_status_outcome_check check (
    (status = 'open' and outcome = 'pending')
    or (status = 'closed' and outcome in ('win', 'loss', 'breakeven'))
  );

create index if not exists trades_user_status_idx
  on public.trades(user_id, status);
