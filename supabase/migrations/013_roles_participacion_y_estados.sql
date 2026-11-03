-- Roles docentes por proyecto, observaciones especializadas y transiciones
-- de estado verificadas en la base de datos.

-- Una persona puede tener varios roles simultaneos en el mismo proyecto.
alter table asignaciones drop constraint asignacion_sin_solape;
alter table asignaciones
  add constraint asignacion_sin_solape exclude using gist (
    proyecto_id with =,
    persona_id with =,
    rol_participacion_id with =,
    vigencia with &&
  );

create or replace function asignar_participacion(
  p_proyecto bigint,
  p_persona uuid,
  p_rol_participacion smallint
) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id bigint;
begin
  if not tiene_permiso('asignacion.gestionar') then
    raise exception 'Sin permiso para asignar participantes';
  end if;

  if not exists (
    select 1
    from persona_rol pr
    join rol r on r.id = pr.rol_id
    where pr.persona_id = p_persona
      and r.codigo = 'DOCENTE'
  ) then
    raise exception 'Los roles de participacion solo se asignan a docentes';
  end if;

  if not exists (
    select 1 from rol_participacion where id = p_rol_participacion
  ) then
    raise exception 'El rol de participacion no existe';
  end if;

  update asignaciones
     set vigencia = daterange(lower(vigencia), current_date, '[)')
   where proyecto_id = p_proyecto
     and persona_id = p_persona
     and rol_participacion_id = p_rol_participacion
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

create or replace function tiene_rol_participacion(
  p_proyecto bigint,
  p_rol text
) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from asignaciones a
    join rol_participacion rp on rp.id = a.rol_participacion_id
    where a.proyecto_id = p_proyecto
      and a.persona_id = persona_actual()
      and current_date <@ a.vigencia
      and rp.codigo = p_rol
  );
$$;

-- El jurado es quien autoriza el ultimo paso; las etapas anteriores conservan
-- sus roles globales de estudiante y coordinador.
alter table transicion_estado
  alter column rol_autorizado_id drop not null;
alter table transicion_estado
  add column rol_participacion_autorizado_id smallint
    references rol_participacion (id) on update cascade;
alter table transicion_estado
  add constraint transicion_estado_un_solo_rol check (
    (rol_autorizado_id is not null and rol_participacion_autorizado_id is null)
    or
    (rol_autorizado_id is null and rol_participacion_autorizado_id is not null)
  );
create unique index transicion_estado_participacion_unica
  on transicion_estado (
    estado_origen_id,
    estado_destino_id,
    rol_participacion_autorizado_id
  )
  where rol_participacion_autorizado_id is not null;

update transicion_estado t
   set rol_autorizado_id = null,
       rol_participacion_autorizado_id = rp.id
  from estado origen, estado destino, rol_participacion rp
 where t.estado_origen_id = origen.id
   and t.estado_destino_id = destino.id
   and origen.codigo = 'SUSTENTADO'
   and destino.codigo = 'FINALIZADO'
   and rp.codigo = 'JURADO';

insert into transicion_estado (
  estado_origen_id,
  estado_destino_id,
  rol_autorizado_id,
  rol_participacion_autorizado_id
)
select origen.id, destino.id, null, rp.id
from estado origen
cross join estado destino
cross join rol_participacion rp
where origen.codigo = 'SUSTENTADO'
  and destino.codigo = 'FINALIZADO'
  and rp.codigo = 'JURADO'
  and not exists (
    select 1
    from transicion_estado t
    where t.estado_origen_id = origen.id
      and t.estado_destino_id = destino.id
  );

create or replace function puede_transicionar_estado(
  p_proyecto bigint,
  p_estado_destino smallint
) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from proyectos p
    join transicion_estado t on t.estado_origen_id = p.estado_actual_id
    join estado destino on destino.id = t.estado_destino_id
    where p.id = p_proyecto
      and t.estado_destino_id = p_estado_destino
      and (
        (
          t.rol_autorizado_id is not null
          and (
            exists (
              select 1
              from persona_rol pr
              join rol r on r.id = pr.rol_id
              where pr.persona_id = persona_actual()
                and r.id = t.rol_autorizado_id
                and (
                  r.codigo <> 'ESTUDIANTE'
                  or es_autor(p_proyecto)
                )
            )
            or (
              exists (
                select 1
                from persona_rol pr
                join rol r on r.id = pr.rol_id
                where pr.persona_id = persona_actual()
                  and r.codigo = 'ADMINISTRADOR'
              )
              and exists (
                select 1 from rol r
                where r.id = t.rol_autorizado_id
                  and r.codigo = 'COORDINADOR'
              )
            )
          )
        )
        or (
          t.rol_participacion_autorizado_id is not null
          and tiene_rol('DOCENTE')
          and exists (
            select 1
            from asignaciones a
            where a.proyecto_id = p_proyecto
              and a.persona_id = persona_actual()
              and a.rol_participacion_id = t.rol_participacion_autorizado_id
              and current_date <@ a.vigencia
          )
        )
      )
  );
$$;

create or replace function validar_transicion_estado_proyecto()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_estado_actual smallint;
  v_codigo_destino text;
  v_actor uuid := persona_actual();
begin
  select p.estado_actual_id
    into v_estado_actual
    from proyectos p
   where p.id = new.proyecto_id
   for update;

  if not found then
    raise exception 'Proyecto % no existe', new.proyecto_id;
  end if;

  select e.codigo into v_codigo_destino
    from estado e
   where e.id = new.estado_id;

  if v_codigo_destino is null then
    raise exception 'Estado % no existe', new.estado_id;
  end if;

  if not exists (
    select 1 from proyecto_estado_hist h
    where h.proyecto_id = new.proyecto_id
  ) and v_estado_actual = new.estado_id and v_codigo_destino = 'BORRADOR' then
    new.usuario_id := coalesce(v_actor, new.usuario_id);
    new.fecha := now();
    return new;
  end if;

  if v_actor is null or new.usuario_id is not null and new.usuario_id <> v_actor then
    raise exception 'No se pudo identificar al usuario que cambia el estado';
  end if;

  if v_estado_actual = new.estado_id
     or not puede_transicionar_estado(new.proyecto_id, new.estado_id) then
    raise exception 'Transicion de estado no permitida para este usuario';
  end if;

  new.usuario_id := v_actor;
  new.fecha := now();
  return new;
end;
$$;

create trigger trg_validar_transicion_estado
  before insert on proyecto_estado_hist
  for each row execute function validar_transicion_estado_proyecto();

drop policy if exists proyecto_estado_hist_alta on proyecto_estado_hist;
create policy proyecto_estado_hist_alta on proyecto_estado_hist
  for insert to authenticated
  with check (puede_transicionar_estado(proyecto_id, estado_id));

-- El rol guardado en asignacion_id determina el ambito de cada observacion.
create or replace function puede_crear_observacion(
  p_proyecto bigint,
  p_ronda bigint,
  p_asignacion bigint
) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select tiene_rol('DOCENTE') and exists (
    select 1
    from asignaciones a
    join rol_participacion rp on rp.id = a.rol_participacion_id
    join rondas r on r.id = p_ronda
    where a.id = p_asignacion
      and a.proyecto_id = p_proyecto
      and a.persona_id = persona_actual()
      and current_date <@ a.vigencia
      and r.proyecto_id = p_proyecto
      and r.cerrada_en is null
      and rp.codigo in (
        'DIRECTOR',
        'CODIRECTOR',
        'EVALUADOR',
        'DIRECTOR_DISCIPLINAR',
        'DIRECTOR_METODOLOGICO'
      )
  );
$$;

drop policy if exists observaciones_alta on observaciones;
create policy observaciones_alta on observaciones
  for insert to authenticated
  with check (
    puede_crear_observacion(proyecto_id, ronda_id, asignacion_id)
  );

drop policy if exists asignaciones_lectura on asignaciones;
create policy asignaciones_lectura on asignaciones
  for select to authenticated using (
    persona_id = persona_actual()
    or tiene_permiso('asignacion.gestionar')
    or es_autor(proyecto_id)
    or esta_asignado(proyecto_id)
  );

create or replace function validar_creador_observacion() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if persona_actual() is null or new.creada_por is distinct from persona_actual() then
    raise exception 'La observacion debe quedar registrada por el usuario actual';
  end if;
  return new;
end;
$$;

create trigger trg_observacion_creador
  before insert on observaciones
  for each row execute function validar_creador_observacion();

create or replace function validar_transicion_observacion() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor uuid := persona_actual();
  v_gestor boolean := tiene_permiso('observacion.gestionar');
  v_evaluador boolean;
  v_director boolean;
  v_autor boolean;
begin
  if new.estado is distinct from old.estado then
    if v_actor is null then
      raise exception 'No se pudo identificar al usuario que cambia la observacion';
    end if;

    if not (
      (old.estado = 'pendiente' and new.estado = 'en_correccion')
      or (old.estado = 'en_correccion' and new.estado in ('solucionada', 'no_aplica'))
      or (old.estado = 'solucionada' and new.estado = 'pendiente')
    ) then
      raise exception 'Transicion de observacion no permitida: % -> %',
        old.estado, new.estado;
    end if;

    if not v_gestor then
      v_autor := tiene_rol('ESTUDIANTE') and es_autor(new.proyecto_id);
      v_evaluador := tiene_rol('DOCENTE')
        and tiene_rol_participacion(new.proyecto_id, 'EVALUADOR');
      v_director := tiene_rol('DOCENTE') and (
        tiene_rol_participacion(new.proyecto_id, 'DIRECTOR')
        or tiene_rol_participacion(new.proyecto_id, 'CODIRECTOR')
      );

      if old.estado = 'pendiente' and new.estado = 'en_correccion' then
        if not v_autor then
          raise exception 'Solo el estudiante autor puede iniciar la correccion';
        end if;
      elsif old.estado = 'en_correccion' then
        if not (v_evaluador or v_director) then
          raise exception 'Se requiere rol de evaluador, director o codirector vigente';
        end if;
      elsif old.estado = 'solucionada' and new.estado = 'pendiente' then
        if not v_evaluador then
          raise exception 'Solo un evaluador vigente puede reabrir la observacion';
        end if;
      end if;
    end if;

    if new.estado in ('solucionada', 'no_aplica') then
      new.cerrada_en := now();
      new.cerrada_por := v_actor;
    else
      new.cerrada_en := null;
      new.cerrada_por := null;
    end if;
  end if;
  return new;
end;
$$;

grant execute on function tiene_rol_participacion(bigint, text)
  to authenticated;
grant execute on function puede_transicionar_estado(bigint, smallint)
  to authenticated;
grant execute on function puede_crear_observacion(bigint, bigint, bigint)
  to authenticated;
