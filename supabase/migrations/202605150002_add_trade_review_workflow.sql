alter table public.trades
  add column if not exists review_status text not null default 'reviewed',
  add column if not exists review_completed_at timestamptz,
  add column if not exists lot_size numeric,
  add column if not exists commission numeric,
  add column if not exists swap numeric;

alter table public.trades
  drop constraint if exists trades_review_status_check;

alter table public.trades
  add constraint trades_review_status_check check (review_status in ('needs_review', 'reviewed'));

update public.trades
set
  review_status = case when synced_from_mt5 then 'needs_review' else 'reviewed' end,
  review_completed_at = case when synced_from_mt5 then null else coalesce(review_completed_at, updated_at) end
where review_status is null
  or review_completed_at is null
  or (synced_from_mt5 and review_status = 'reviewed');

create index if not exists trades_user_review_status_idx
  on public.trades(user_id, review_status);
