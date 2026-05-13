insert into storage.buckets (id, name, public)
values ('chart-screenshots', 'chart-screenshots', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users can upload chart screenshots" on storage.objects;
create policy "Users can upload chart screenshots" on storage.objects
  for insert
  with check (
    bucket_id = 'chart-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can view own chart screenshots" on storage.objects;
create policy "Users can view own chart screenshots" on storage.objects
  for select
  using (
    bucket_id = 'chart-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
