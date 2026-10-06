-- Files are a PRIVATE exchange between one student and the tutor.
-- No "shared with everyone": each file belongs to exactly one student.
-- Run AFTER 20261006000200_students.sql.

begin;

-- Remove the old rules first (they reference the old `visibility` column).
drop policy if exists resources_read   on public.resources;
drop policy if exists resources_insert on public.resources;
drop policy if exists resources_update on public.resources;
drop policy if exists resources_delete on public.resources;
drop policy if exists resources_obj_read   on storage.objects;
drop policy if exists resources_obj_insert on storage.objects;
drop policy if exists resources_obj_delete on storage.objects;

alter table public.resources add column if not exists student_id uuid references public.profiles (id) on delete cascade;

-- Keep students' own earlier uploads; drop old "shared with all" rows (no single owner).
update public.resources r set student_id = r.uploader_id
 where r.student_id is null
   and exists (select 1 from public.profiles p where p.id = r.uploader_id and p.role = 'student');
delete from public.resources where student_id is null;

alter table public.resources alter column student_id set not null;
alter table public.resources drop column if exists visibility;

create index if not exists resources_student_idx on public.resources (student_id, created_at desc);

-- A stored file must live in its student's own folder: <student_id>/<file>
alter table public.resources drop constraint if exists resources_path_in_student_folder;
alter table public.resources add constraint resources_path_in_student_folder
  check (storage_path is null or split_part(storage_path, '/', 1) = student_id::text);

-- ───────── Row-level security on the table ─────────
revoke update on public.resources from authenticated;

-- See: your own file exchange (tutor sees everything).
create policy resources_read on public.resources for select to authenticated
  using (public.is_admin() or student_id = auth.uid());

-- Add: the tutor can send to any student; a student can only send into their own exchange.
create policy resources_insert on public.resources for insert to authenticated
  with check (
    public.is_admin()
    or (student_id = auth.uid() and uploader_id = auth.uid())
  );

-- Delete: tutor can remove anything; a student can only remove files THEY uploaded.
create policy resources_delete on public.resources for delete to authenticated
  using (public.is_admin() or (student_id = auth.uid() and uploader_id = auth.uid()));

-- ───────── Storage (the files themselves) ─────────
create policy resources_obj_read on storage.objects for select to authenticated
  using (bucket_id = 'resources' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

create policy resources_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'resources' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

-- A student may only delete files they uploaded themselves, not ones the tutor sent them.
create policy resources_obj_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'resources' and (
      public.is_admin()
      or exists (select 1 from public.resources r
                 where r.storage_path = name and r.uploader_id = auth.uid() and r.student_id = auth.uid())
    )
  );

commit;
