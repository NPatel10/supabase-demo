-- Create avatars bucket if missing
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow public read access to avatars bucket
create policy "Avatar images are publicly accessible"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to manage their own avatars
create policy "Users can upload avatars"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'avatars' and auth.uid() = owner);

create policy "Users can update avatars"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'avatars' and auth.uid() = owner);

create policy "Users can delete avatars"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'avatars' and auth.uid() = owner);
