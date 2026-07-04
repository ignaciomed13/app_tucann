-- Nuevo tipo de log "sanidad" (plagas/enfermedades) + almacenamiento de fotos.

alter type public.log_type add value if not exists 'sanidad';

-- Bucket privado para las fotos de los cultivos.
insert into storage.buckets (id, name, public)
values ('grow-photos', 'grow-photos', false)
on conflict (id) do nothing;

-- RLS en storage.objects: cada usuario solo accede a su propia carpeta.
-- Convención de path: {user_id}/{grow_id}/{archivo}
drop policy if exists "grow_photos_select_own" on storage.objects;
create policy "grow_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'grow-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "grow_photos_insert_own" on storage.objects;
create policy "grow_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'grow-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "grow_photos_delete_own" on storage.objects;
create policy "grow_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'grow-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
