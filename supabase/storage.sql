-- Buckets recomendados para evidencias, firmas, reportes y documentos.
-- Requiere Supabase Storage habilitado.

insert into storage.buckets (id, name, public)
values
  ('project-evidence', 'project-evidence', false),
  ('project-reports', 'project-reports', false),
  ('signatures', 'signatures', false),
  ('service-documents', 'service-documents', false)
on conflict (id) do nothing;

-- Convencion de rutas:
--   <company_id>/<entity>/<entity_id>/<archivo>
-- Ejemplo:
--   00000000-0000-0000-0000-000000000000/projects/abc/foto.jpg

drop policy if exists "project evidence read own company" on storage.objects;
create policy "project evidence read own company"
on storage.objects for select
using (
  bucket_id in ('project-evidence','project-reports','signatures','service-documents')
  and auth.uid() is not null
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

drop policy if exists "project evidence write operations" on storage.objects;
create policy "project evidence write operations"
on storage.objects for insert
with check (
  bucket_id in ('project-evidence','project-reports','signatures','service-documents')
  and public.current_role() in ('admin','gerente_general','gerente_operaciones_admin','operaciones','supervisor','tecnico','almacen')
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

drop policy if exists "project evidence update operations" on storage.objects;
create policy "project evidence update operations"
on storage.objects for update
using (
  bucket_id in ('project-evidence','project-reports','signatures','service-documents')
  and public.current_role() in ('admin','gerente_general','gerente_operaciones_admin','operaciones','supervisor')
  and (storage.foldername(name))[1] = public.current_company_id()::text
)
with check (
  bucket_id in ('project-evidence','project-reports','signatures','service-documents')
  and public.current_role() in ('admin','gerente_general','gerente_operaciones_admin','operaciones','supervisor')
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

drop policy if exists "project evidence delete admin" on storage.objects;
create policy "project evidence delete admin"
on storage.objects for delete
using (
  bucket_id in ('project-evidence','project-reports','signatures','service-documents')
  and public.current_role() in ('admin','gerente_general','operaciones')
  and (storage.foldername(name))[1] = public.current_company_id()::text
);
