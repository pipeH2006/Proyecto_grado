alter table observaciones
  add column proyecto_requisito_id bigint
    references proyecto_requisito (id) on delete restrict;

create index observaciones_proyecto_requisito_idx
  on observaciones (proyecto_requisito_id, creada_en);

create or replace function puede_crear_observacion(
  p_proyecto bigint,
  p_ronda bigint,
  p_asignacion bigint,
  p_proyecto_requisito bigint
) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select tiene_rol('DOCENTE')
    and exists (
      select 1
      from proyecto_requisito pr
      where pr.id = p_proyecto_requisito
        and pr.proyecto_id = p_proyecto
    )
    and exists (
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

revoke all on function puede_crear_observacion(bigint, bigint, bigint, bigint)
  from public;
grant execute on function puede_crear_observacion(bigint, bigint, bigint, bigint)
  to authenticated;

drop policy if exists observaciones_alta on observaciones;
create policy observaciones_alta on observaciones
  for insert to authenticated
  with check (
    puede_crear_observacion(
      proyecto_id,
      ronda_id,
      asignacion_id,
      proyecto_requisito_id
    )
  );

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
  if new.proyecto_requisito_id is not null
     and (select proyecto_id
          from proyecto_requisito
          where id = new.proyecto_requisito_id)
       is distinct from new.proyecto_id then
    raise exception 'El requisito no pertenece al proyecto %', new.proyecto_id;
  end if;

  if tg_op = 'INSERT' then
    new.estado_proyecto_id := v_estado;
  elsif new.estado_proyecto_id is distinct from old.estado_proyecto_id then
    raise exception 'La etapa de una observacion es inmutable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_observacion_proyecto on observaciones;
create trigger trg_observacion_proyecto
  before insert or update of
    ronda_id,
    asignacion_id,
    proyecto_id,
    proyecto_requisito_id
  on observaciones
  for each row execute function validar_observacion_proyecto();

create or replace function trg_observacion_inmutable() returns trigger
language plpgsql as $$
begin
  if new.proyecto_id    is distinct from old.proyecto_id
     or new.texto         is distinct from old.texto
     or new.ronda_id      is distinct from old.ronda_id
     or new.asignacion_id is distinct from old.asignacion_id
     or new.proyecto_requisito_id is distinct from old.proyecto_requisito_id
     or new.estado_proyecto_id is distinct from old.estado_proyecto_id
     or new.severidad     is distinct from old.severidad
     or new.creada_por    is distinct from old.creada_por
     or new.creada_en     is distinct from old.creada_en then
    raise exception 'Las observaciones, su requisito y etapa son inmutables';
  end if;
  return new;
end;
$$;
