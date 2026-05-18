create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('bug', 'improvement')),
  category text not null default 'other',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'blocking')),
  title text,
  message text not null,
  page_url text,
  user_agent text,
  browser_language text,
  viewport_width integer,
  viewport_height integer,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_reports_user_created_idx
  on public.feedback_reports(user_id, created_at desc);

create index if not exists feedback_reports_status_created_idx
  on public.feedback_reports(status, created_at desc);

create index if not exists feedback_reports_type_created_idx
  on public.feedback_reports(type, created_at desc);

drop trigger if exists set_feedback_reports_updated_at on public.feedback_reports;
create trigger set_feedback_reports_updated_at
  before update on public.feedback_reports
  for each row execute function public.set_updated_at();

alter table public.feedback_reports enable row level security;

drop policy if exists "Feedback reports can be created by owner" on public.feedback_reports;
create policy "Feedback reports can be created by owner" on public.feedback_reports
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Feedback reports can be read by owner" on public.feedback_reports;
create policy "Feedback reports can be read by owner" on public.feedback_reports
  for select
  using (auth.uid() = user_id);
