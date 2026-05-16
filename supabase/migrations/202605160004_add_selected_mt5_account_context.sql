alter table public.profiles
  add column if not exists selected_mt5_connection_id uuid;

alter table public.profiles
  drop constraint if exists profiles_selected_mt5_connection_id_fkey;

alter table public.profiles
  add constraint profiles_selected_mt5_connection_id_fkey
  foreign key (selected_mt5_connection_id) references public.mt5_connections(id) on delete set null;

create index if not exists profiles_selected_mt5_connection_idx
  on public.profiles(selected_mt5_connection_id)
  where selected_mt5_connection_id is not null;
