-- 004_storage_documentos.sql
-- RF-07: el estudiante responde una observacion adjuntando evidencia.
--
-- Bucket privado 'documentos' y politicas de Storage que delegan por completo en
-- las funciones de la RLS de las tablas (es_autor, esta_asignado, es_gestor,
-- puede_ver_proyecto): no se duplica la logica de permisos, solo cambia la fuente
-- del proyecto_id, que se deriva de la ruta del objeto.
--
-- Convencion de ruta obligatoria:
--   proyectos/<proyecto_id>/<observacion_id>/<uuid>.pdf
-- El segundo segmento es el proyecto. Si la ruta no sigue la convencion,
-- documento_proyecto_id() devuelve null y la politica deniega.

do $migracion$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'esquema storage ausente: se omiten bucket y politicas de documentos';
    return;
  end if;

  -- storage.objects ya viene con RLS habilitado en Supabase y su owner es
  -- supabase_storage_admin: no se puede (ni hace falta) alterarla aqui.

  insert into storage.buckets (id, name, public)
  values ('documentos', 'documentos', false)
  on conflict (id) do nothing;

  -- Deriva el proyecto de la ruta; null si no cumple la convencion.
  execute $fn$
    create or replace function public.documento_proyecto_id(p_name text)
    returns bigint
    language sql immutable
    set search_path = storage, pg_temp
    as $body$
      select case
        when (storage.foldername(p_name))[1] = 'proyectos'
         and (storage.foldername(p_name))[2] ~ '^[0-9]+$'
        then ((storage.foldername(p_name))[2])::bigint
      end;
    $body$;
  $fn$;

  execute 'drop policy if exists documentos_storage_lectura on storage.objects';
  execute $pol$
    create policy documentos_storage_lectura on storage.objects
      for select to authenticated
      using (
        bucket_id = 'documentos'
        and puede_ver_proyecto(public.documento_proyecto_id(name))
      );
  $pol$;

  execute 'drop policy if exists documentos_storage_alta on storage.objects';
  execute $pol$
    create policy documentos_storage_alta on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'documentos'
        and (
          es_autor(public.documento_proyecto_id(name))
          or esta_asignado(public.documento_proyecto_id(name))
          or es_gestor()
        )
      );
  $pol$;

  execute 'drop policy if exists documentos_storage_edicion on storage.objects';
  execute $pol$
    create policy documentos_storage_edicion on storage.objects
      for update to authenticated
      using (
        bucket_id = 'documentos'
        and (
          es_autor(public.documento_proyecto_id(name))
          or esta_asignado(public.documento_proyecto_id(name))
          or es_gestor()
        )
      )
      with check (bucket_id = 'documentos');
  $pol$;

  execute 'drop policy if exists documentos_storage_borrado on storage.objects';
  execute $pol$
    create policy documentos_storage_borrado on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'documentos'
        and (
          es_autor(public.documento_proyecto_id(name))
          or es_gestor()
        )
      );
  $pol$;
end
$migracion$;
