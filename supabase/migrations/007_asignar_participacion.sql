-- 007_asignar_participacion.sql
-- RF-04. Asignar (o cambiar) un participante de un proyecto respetando la
-- vigencia daterange: se cierra el rango vigente de esa persona en el proyecto
-- y se abre uno nuevo desde hoy. Nunca un booleano "activo" (ver AGENTS.md).
--
-- Va en una funcion SQL y no en la app porque el cierre del rango necesita
-- daterange(current_date, ...) y porque el constraint de exclusion
-- asignacion_sin_solape exigiria dos escrituras atomicas.

create or replace function asignar_participacion(
  p_proyecto bigint,
  p_persona uuid,
  p_rol_participacion smallint
) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id bigint;
begin
  if not es_gestor() then
    raise exception 'Solo coordinadores o administradores pueden asignar participantes';
  end if;

  -- Cerrar el rango abierto. Si ya empezo hoy, el nuevo rango queda vacio
  -- daterange(x, x, '[)') y no se solapa (los rangos vacios nunca chocan).
  update asignaciones
     set vigencia = daterange(lower(vigencia), current_date, '[)')
   where proyecto_id = p_proyecto
     and persona_id = p_persona
     and upper_inf(vigencia);

  insert into asignaciones (
    proyecto_id, persona_id, rol_participacion_id, creada_por
  )
  values (
    p_proyecto, p_persona, p_rol_participacion, persona_actual()
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function asignar_participacion(bigint, uuid, smallint)
  to authenticated;
