-- Run this once in the Supabase SQL editor to add profile picture support
-- to an existing project (the "avatars" storage bucket was already created
-- programmatically — this just adds the column and access policies).

alter table public.profiles add column if not exists avatar_url text;

-- Anyone can view an avatar (they're public profile pictures)
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can only upload/update/delete files inside their own user-id folder,
-- e.g. avatars/<user_id>/avatar.png
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
