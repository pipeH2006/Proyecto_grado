-- Separa la retroalimentacion de desarrollo de los intentos formales de
-- sustentacion, que son gestionados por el jurado.

alter table observaciones
  alter column ronda_id drop not null;

alter table observaciones
  add column estado_proyecto_id smallint references estado (id);

update observaciones o
   set estado_proyecto_id = coalesce(
     (
       select h.estado_id
       from proyecto_estado_hist h
       where h.proyecto_id = o.proyecto_id
         and h.fecha <= o.creada_en
       order by h.fecha desc, h.id desc
       limit 1
     ),
     p.estado_actual_id
   )
  from proyectos p
 where p.id = o.proyecto_id;

alter table observaciones
  alter column estado_proyecto_id set not null;

alter table rondas
  add column cerrada_por uuid references persona (id),
  add column dictamen text
    check (dictamen in ('APROBADO', 'REQUIERE_AJUSTES')),
  add column observacion_dictamen text;

alter table rondas
  add constraint ronda_dictamen_cierre check (
    (cerrada_en is null and cerrada_por is null and dictamen is null)
    or
    (
      cerrada_en is not null
      and cerrada_por is null
      and dictamen is null
      and observacion_dictamen is null
    )
    or
    (
      cerrada_en is not null
      and cerrada_por is not null
      and dictamen is not null
    )
  );

create table solicitudes_sustentacion (
  id              bigint generated always as identity primary key,
  proyecto_id     bigint not null references proyectos (id) on delete cascade,
  solicitada_por  uuid not null references persona (id),
  solicitada_en   timestamptz not null default now(),
  confirmada_por  uuid references persona (id),
  confirmada_en   timestamptz,
  estado          text not null default 'PENDIENTE_DIRECTOR'
    check (estado in (
      'PENDIENTE_DIRECTOR',
      'PENDIENTE_JURADO',
      'APROBADA',
      'REQUIERE_AJUSTES'
    )),
  check (
    (estado = 'PENDIENTE_DIRECTOR'
      and confirmada_por is null and confirmada_en is null)
    or
    (estado <> 'PENDIENTE_DIRECTOR'
      and confirmada_por is not null and confirmada_en is not null)
  )
);
create index solicitudes_sustentacion_proyecto_idx
  on solicitudes_sustentacion (proyecto_id, solicitada_en desc);
create unique index solicitudes_sustentacion_pendiente_unica_idx
  on solicitudes_sustentacion (proyecto_id)
  where estado in ('PENDIENTE_DIRECTOR', 'PENDIENTE_JURADO');

alter table solicitudes_sustentacion enable row level security;
create policy solicitudes_sustentacion_lectura
  on solicitudes_sustentacion for select to authenticated
  using (puede_ver_proyecto(proyecto_id));

-- Una solicitud solo se permite cuando todos los requisitos obligatorios
-- están aprobados y el proyecto continúa en desarrollo.
create or replace function solicitar_sustentacion(p_proyecto bigint)
returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_persona uuid := persona_actual();
  v_solicitud bigint;
begin
  perform 1 from proyectos where id = p_proyecto for update;
  if not found then
    raise exception 'Proyecto no encontrado';
  end if;

  if v_persona is null
     or not tiene_rol('ESTUDIANTE')
     or not es_autor(p_proyecto) then
    raise exception 'Solo el estudiante autor puede solicitar sustentacion';
  end if;

  if not exists (
    select 1
    from proyectos p
    join estado e on e.id = p.estado_actual_id
    where p.id = p_proyecto and e.codigo = 'EN_DESARROLLO'
  ) then
    raise exception 'El proyecto debe estar EN_DESARROLLO para solicitar sustentacion';
  end if;

  if not exists (
    select 1
    from proyecto_requisito pr
    join modalidad_requisito mr on mr.id = pr.modalidad_requisito_id
    where pr.proyecto_id = p_proyecto and mr.obligatorio
  ) or exists (
    select 1
    from proyecto_requisito pr
    join modalidad_requisito mr on mr.id = pr.modalidad_requisito_id
    join estado_cumplimiento ec on ec.id = pr.estado_cumplimiento_id
    where pr.proyecto_id = p_proyecto
      and mr.obligatorio
      and ec.codigo <> 'APROBADO'
  ) then
    raise exception 'Todos los requisitos obligatorios deben estar aprobados';
  end if;

  if exists (
    select 1
    from solicitudes_sustentacion s
    where s.proyecto_id = p_proyecto
      and s.estado in ('PENDIENTE_DIRECTOR', 'PENDIENTE_JURADO')
  ) then
    raise exception 'Ya existe una solicitud de sustentacion pendiente';
  end if;

  insert into solicitudes_sustentacion (proyecto_id, solicitada_por)
  values (p_proyecto, v_persona)
  returning id into v_solicitud;

  return v_solicitud;
end;
$$;

-- El director confirma la preparación y el proyecto entra en SUSTENTADO.
update transicion_estado t
   set rol_autorizado_id = null,
       rol_participacion_autorizado_id = rp.id
  from estado origen, estado destino, rol_participacion rp
 where t.estado_origen_id = origen.id
   and t.estado_destino_id = destino.id
   and origen.codigo = 'EN_DESARROLLO'
   and destino.codigo = 'SUSTENTADO'
   and rp.codigo = 'DIRECTOR';

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
where origen.codigo = 'EN_DESARROLLO'
  and destino.codigo = 'SUSTENTADO'
  and rp.codigo = 'DIRECTOR'
  and not exists (
    select 1 from transicion_estado t
    where t.estado_origen_id = origen.id
      and t.estado_destino_id = destino.id
  );

create or replace function confirmar_solicitud_sustentacion(p_solicitud bigint)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_persona uuid := persona_actual();
  v_proyecto bigint;
begin
  select proyecto_id into v_proyecto
  from solicitudes_sustentacion
  where id = p_solicitud
    and estado = 'PENDIENTE_DIRECTOR'
  for update;

  if v_proyecto is null then
    raise exception 'La solicitud no existe o ya fue procesada';
  end if;
  if v_persona is null
     or not tiene_rol('DOCENTE')
     or not tiene_rol_participacion(v_proyecto, 'DIRECTOR') then
    raise exception 'Solo el director vigente puede confirmar la sustentacion';
  end if;

  if not exists (
    select 1
    from proyecto_requisito pr
    join modalidad_requisito mr on mr.id = pr.modalidad_requisito_id
    where pr.proyecto_id = v_proyecto and mr.obligatorio
  ) or exists (
    select 1
    from proyecto_requisito pr
    join modalidad_requisito mr on mr.id = pr.modalidad_requisito_id
    join estado_cumplimiento ec on ec.id = pr.estado_cumplimiento_id
    where pr.proyecto_id = v_proyecto
      and mr.obligatorio
      and ec.codigo <> 'APROBADO'
  ) then
    raise exception 'Todos los requisitos obligatorios deben seguir aprobados';
  end if;

  update solicitudes_sustentacion
     set estado = 'PENDIENTE_JURADO',
         confirmada_por = v_persona,
         confirmada_en = now()
   where id = p_solicitud;

  insert into proyecto_estado_hist (proyecto_id, estado_id, usuario_id, observacion)
  select v_proyecto, e.id, v_persona, 'Director confirma solicitud de sustentacion'
  from estado e
  where e.codigo = 'SUSTENTADO';
end;
$$;

create or replace function abrir_ronda_sustentacion(p_proyecto bigint)
returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_persona uuid := persona_actual();
  v_numero smallint;
  v_ronda bigint;
begin
    perform 1 from proyectos where id = p_proyecto for update;
    if not found then
      raise exception 'Proyecto no encontrado';
    end if;

    if v_persona is null
     or not tiene_rol('DOCENTE')
     or not tiene_rol_participacion(p_proyecto, 'JURADO') then
    raise exception 'Solo un jurado vigente puede abrir un intento de sustentacion';
  end if;

  if not exists (
    select 1 from proyectos p
    join estado e on e.id = p.estado_actual_id
    where p.id = p_proyecto and e.codigo = 'SUSTENTADO'
  ) then
    raise exception 'El proyecto debe estar listo para sustentacion';
  end if;

  if not exists (
    select 1 from solicitudes_sustentacion s
    where s.proyecto_id = p_proyecto and s.estado = 'PENDIENTE_JURADO'
  ) then
    raise exception 'Se requiere una solicitud confirmada por el director';
  end if;

  select coalesce(max(numero), 0) + 1 into v_numero
  from rondas where proyecto_id = p_proyecto;

  insert into rondas (proyecto_id, numero, abierta_por)
  values (p_proyecto, v_numero, v_persona)
  returning id into v_ronda;

  return v_ronda;
end;
$$;

-- El dictamen del jurado cierra el intento y determina el siguiente estado.
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
  and destino.codigo = 'EN_DESARROLLO'
  and rp.codigo = 'JURADO'
  and not exists (
    select 1 from transicion_estado t
    where t.estado_origen_id = origen.id
      and t.estado_destino_id = destino.id
      and t.rol_participacion_autorizado_id = rp.id
  );

create or replace function cerrar_ronda_sustentacion(
  p_proyecto bigint,
  p_ronda bigint,
  p_dictamen text,
  p_observacion text
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_persona uuid := persona_actual();
  v_estado_destino text;
begin
  if p_dictamen is null
     or p_dictamen not in ('APROBADO', 'REQUIERE_AJUSTES') then
    raise exception 'Dictamen de sustentacion invalido';
  end if;
  if length(coalesce(p_observacion, '')) > 2000 then
    raise exception 'La observacion del dictamen excede 2000 caracteres';
  end if;
  if v_persona is null
     or not tiene_rol('DOCENTE')
     or not tiene_rol_participacion(p_proyecto, 'JURADO') then
    raise exception 'Solo un jurado vigente puede cerrar el intento';
  end if;

  perform 1 from proyectos where id = p_proyecto for update;
  if not found then
    raise exception 'Proyecto no encontrado';
  end if;
  if not exists (
    select 1
    from proyectos p
    join estado e on e.id = p.estado_actual_id
    where p.id = p_proyecto and e.codigo = 'SUSTENTADO'
  ) or not exists (
    select 1 from solicitudes_sustentacion s
    where s.proyecto_id = p_proyecto
      and s.estado = 'PENDIENTE_JURADO'
  ) then
    raise exception 'No hay una solicitud vigente para cerrar un intento';
  end if;

  if p_dictamen = 'APROBADO' then
    if exists (
      select 1 from observaciones o
      where o.ronda_id = p_ronda
        and o.estado in ('pendiente', 'en_correccion')
    ) then
      raise exception 'No se puede aprobar con observaciones pendientes';
    end if;
    v_estado_destino := 'FINALIZADO';
  else
    v_estado_destino := 'EN_DESARROLLO';
  end if;

  update rondas
     set cerrada_en = now(),
         cerrada_por = v_persona,
         dictamen = p_dictamen,
         observacion_dictamen = nullif(trim(p_observacion), '')
   where id = p_ronda
     and proyecto_id = p_proyecto
     and cerrada_en is null;

  if not found then
    raise exception 'El intento ya fue cerrado o no pertenece al proyecto';
  end if;

  update solicitudes_sustentacion
     set estado = case
       when p_dictamen = 'APROBADO' then 'APROBADA'
       else 'REQUIERE_AJUSTES'
     end
   where proyecto_id = p_proyecto
     and estado = 'PENDIENTE_JURADO';

  insert into proyecto_estado_hist (proyecto_id, estado_id, usuario_id, observacion)
  select p_proyecto, e.id, v_persona, coalesce(nullif(trim(p_observacion), ''), p_dictamen)
  from estado e
  where e.codigo = v_estado_destino;
end;
$$;

-- Las rondas de sustentacion las gestiona el jurado, no la coordinacion.
drop policy if exists rondas_gestion on rondas;
create policy rondas_gestion on rondas
  for all to authenticated
  using (tiene_rol('ADMINISTRADOR'))
  with check (tiene_rol('ADMINISTRADOR'));

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
                and (r.codigo <> 'ESTUDIANTE' or es_autor(p_proyecto))
            )
            or (
              tiene_rol('ADMINISTRADOR')
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
          and (
            (
              destino.codigo = 'SUSTENTADO'
              and exists (
                select 1 from solicitudes_sustentacion s
                where s.proyecto_id = p_proyecto
                  and s.estado = 'PENDIENTE_JURADO'
                  and s.confirmada_por = persona_actual()
              )
            )
            or (
              destino.codigo = 'FINALIZADO'
              and exists (
                select 1 from rondas r
                join solicitudes_sustentacion s
                  on s.proyecto_id = r.proyecto_id
                where r.proyecto_id = p_proyecto
                  and r.cerrada_por = persona_actual()
                  and r.dictamen = 'APROBADO'
                  and r.cerrada_en is not null
                  and s.estado = 'APROBADA'
                  and s.confirmada_en <= r.abierta_en
                  and not exists (
                    select 1 from solicitudes_sustentacion nueva
                    where nueva.proyecto_id = s.proyecto_id
                      and nueva.id > s.id
                  )
              )
            )
            or (
              destino.codigo = 'EN_DESARROLLO'
              and exists (
                select 1 from rondas r
                join solicitudes_sustentacion s
                  on s.proyecto_id = r.proyecto_id
                where r.proyecto_id = p_proyecto
                  and r.cerrada_por = persona_actual()
                  and r.dictamen = 'REQUIERE_AJUSTES'
                  and r.cerrada_en is not null
                  and s.estado = 'REQUIERE_AJUSTES'
                  and s.confirmada_en <= r.abierta_en
                  and not exists (
                    select 1 from solicitudes_sustentacion nueva
                    where nueva.proyecto_id = s.proyecto_id
                      and nueva.id > s.id
                  )
              )
            )
          )
        )
      )
  );
$$;

drop policy if exists observaciones_alta on observaciones;
create policy observaciones_alta on observaciones
  for insert to authenticated
  with check (
    tiene_rol('DOCENTE')
    and puede_crear_observacion(proyecto_id, ronda_id, asignacion_id)
  );

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
    join proyectos p on p.id = p_proyecto
    join estado e on e.id = p.estado_actual_id
    left join rondas r on r.id = p_ronda
    where a.id = p_asignacion
      and a.proyecto_id = p_proyecto
      and a.persona_id = persona_actual()
      and current_date <@ a.vigencia
      and (
        (
          p_ronda is null
          and (
            (e.codigo = 'EN_REVISION' and rp.codigo = 'EVALUADOR')
            or (
              e.codigo = 'EN_DESARROLLO'
              and rp.codigo in (
                'DIRECTOR',
                'CODIRECTOR',
                'DIRECTOR_DISCIPLINAR',
                'DIRECTOR_METODOLOGICO'
              )
            )
          )
        )
        or (
          p_ronda is not null
          and e.codigo = 'SUSTENTADO'
          and rp.codigo = 'JURADO'
          and r.id = p_ronda
          and r.proyecto_id = p_proyecto
          and r.cerrada_en is null
        )
      )
  );
$$;

create or replace function validar_observacion_proyecto() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_estado smallint;
begin
  select estado_actual_id into v_estado
  from proyectos where id = new.proyecto_id;

  if not found then
    raise exception 'Proyecto % no existe', new.proyecto_id;
  end if;

  if new.ronda_id is not null
     and (select proyecto_id from rondas where id = new.ronda_id)
       is distinct from new.proyecto_id then
    raise exception 'proyecto_id no coincide con la ronda %', new.ronda_id;
  end if;
  if new.asignacion_id is not null
     and (select proyecto_id from asignaciones where id = new.asignacion_id)
       is distinct from new.proyecto_id then
    raise exception 'proyecto_id no coincide con la asignacion %', new.asignacion_id;
  end if;

  if tg_op = 'INSERT' then
    new.estado_proyecto_id := v_estado;
  elsif new.estado_proyecto_id is distinct from old.estado_proyecto_id then
    raise exception 'La etapa de una observacion es inmutable';
  end if;

  return new;
end;
$$;

create or replace function trg_observacion_inmutable() returns trigger
language plpgsql as $$
begin
  if new.proyecto_id    is distinct from old.proyecto_id
     or new.texto         is distinct from old.texto
     or new.ronda_id      is distinct from old.ronda_id
     or new.asignacion_id is distinct from old.asignacion_id
     or new.estado_proyecto_id is distinct from old.estado_proyecto_id
     or new.severidad     is distinct from old.severidad
     or new.creada_por    is distinct from old.creada_por
     or new.creada_en     is distinct from old.creada_en then
    raise exception 'Las observaciones y su etapa son inmutables';
  end if;
  return new;
end;
$$;

create or replace function validar_transicion_observacion() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor uuid := persona_actual();
  v_gestor boolean := tiene_permiso('observacion.gestionar');
  v_autor boolean;
  v_puede_resolver boolean;
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

      if old.estado = 'pendiente' and new.estado = 'en_correccion' then
        if not v_autor then
          raise exception 'Solo el estudiante autor puede iniciar la correccion';
        end if;
      elsif old.estado = 'en_correccion' then
        v_puede_resolver := tiene_rol('DOCENTE') and (
          (
            exists (
              select 1 from estado e
              where e.id = new.estado_proyecto_id
                and e.codigo = 'EN_DESARROLLO'
            )
            and (
              tiene_rol_participacion(new.proyecto_id, 'DIRECTOR')
              or tiene_rol_participacion(new.proyecto_id, 'CODIRECTOR')
            )
          )
          or (
            exists (
              select 1 from estado e
              where e.id = new.estado_proyecto_id
                and e.codigo = 'EN_REVISION'
            )
            and tiene_rol_participacion(new.proyecto_id, 'EVALUADOR')
          )
          or (
            exists (
              select 1 from estado e
              where e.id = new.estado_proyecto_id
                and e.codigo = 'SUSTENTADO'
            )
            and tiene_rol_participacion(new.proyecto_id, 'JURADO')
          )
        );
        if not v_puede_resolver then
          raise exception 'No tienes un rol vigente para resolver esta observacion';
        end if;
      elsif old.estado = 'solucionada' and new.estado = 'pendiente' then
        if not (
          tiene_rol('DOCENTE')
          and tiene_rol_participacion(new.proyecto_id, 'EVALUADOR')
        ) then
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

-- El director puede confirmar la solicitud y el jurado decide la sustentacion.
grant execute on function solicitar_sustentacion(bigint) to authenticated;
grant execute on function confirmar_solicitud_sustentacion(bigint) to authenticated;
grant execute on function abrir_ronda_sustentacion(bigint) to authenticated;
grant execute on function cerrar_ronda_sustentacion(bigint, bigint, text, text)
  to authenticated;

grant execute on function puede_transicionar_estado(bigint, smallint)
  to authenticated;
