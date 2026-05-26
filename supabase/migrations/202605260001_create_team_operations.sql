create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  full_name text,
  role text not null default 'staff',
  job_title text,
  status text not null default 'active',
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_members_role_check check (role in ('owner', 'admin', 'manager', 'staff', 'viewer')),
  constraint team_members_status_check check (status in ('active', 'inactive', 'invited')),
  constraint team_members_email_unique unique (email)
);

create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  priority text not null default 'medium',
  status text not null default 'todo',
  task_type text not null default 'general',
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.team_members(id) on delete set null,
  related_feedback_id uuid references public.feedback_reports(id) on delete set null,
  page_url text,
  due_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_tasks_priority_check check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint team_tasks_status_check check (status in ('todo', 'in_progress', 'blocked', 'submitted', 'approved', 'done')),
  constraint team_tasks_type_check check (task_type in ('general', 'bug', 'feature', 'qa', 'content', 'support', 'design', 'ops'))
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.team_tasks(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  author_email text,
  kind text not null default 'comment',
  body text not null,
  created_at timestamptz not null default now(),
  constraint task_comments_kind_check check (kind in ('comment', 'submission', 'approval', 'revision', 'status'))
);

create index if not exists team_members_email_idx on public.team_members(lower(email));
create index if not exists team_members_user_idx on public.team_members(user_id);
create index if not exists team_members_status_idx on public.team_members(status);
create index if not exists team_tasks_assigned_status_idx on public.team_tasks(assigned_to, status);
create index if not exists team_tasks_status_created_idx on public.team_tasks(status, created_at desc);
create index if not exists team_tasks_feedback_idx on public.team_tasks(related_feedback_id) where related_feedback_id is not null;
create index if not exists task_comments_task_created_idx on public.task_comments(task_id, created_at desc);

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at
  before update on public.team_members
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_team_tasks_updated_at on public.team_tasks;
create trigger set_team_tasks_updated_at
  before update on public.team_tasks
  for each row
  execute function public.set_updated_at();

alter table public.team_members enable row level security;
alter table public.team_tasks enable row level security;
alter table public.task_comments enable row level security;

drop policy if exists "Team members can read self" on public.team_members;
create policy "Team members can read self" on public.team_members
  for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) or user_id = auth.uid());

drop policy if exists "Team members can read assigned tasks" on public.team_tasks;
create policy "Team members can read assigned tasks" on public.team_tasks
  for select
  using (
    assigned_to in (
      select id from public.team_members
      where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) or user_id = auth.uid()
    )
  );

drop policy if exists "Team members can read own task comments" on public.task_comments;
create policy "Team members can read own task comments" on public.task_comments
  for select
  using (
    task_id in (
      select team_tasks.id
      from public.team_tasks
      join public.team_members on team_members.id = team_tasks.assigned_to
      where lower(team_members.email) = lower(coalesce(auth.jwt() ->> 'email', '')) or team_members.user_id = auth.uid()
    )
  );
