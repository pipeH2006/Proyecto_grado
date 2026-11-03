alter table observaciones
  add column ambito text not null default 'GENERAL'
  check (ambito in ('GENERAL', 'DISCIPLINAR', 'METODOLOGICO'));

update observaciones o
   set ambito = case rp.codigo
     when 'DIRECTOR_DISCIPLINAR' then 'DISCIPLINAR'
     when 'DIRECTOR_METODOLOGICO' then 'METODOLOGICO'
     else 'GENERAL'
   end
  from asignaciones a
  join rol_participacion rp on rp.id = a.rol_participacion_id
 where a.id = o.asignacion_id;

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
      join estado_cumplimiento ec on ec.id = pr.estado_cumplimiento_id
      where pr.id = p_proyecto_requisito
        and pr.proyecto_id = p_proyecto
        and ec.codigo in ('ENTREGADO', 'RECHAZADO')
        and exists (
          select 1
          from documentos d
          where d.proyecto_requisito_id = pr.id
        )
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

create or replace function trg_observacion_inmutable() returns trigger
language plpgsql as $$
begin
  if new.proyecto_id    is distinct from old.proyecto_id
     or new.texto         is distinct from old.texto
     or new.ronda_id      is distinct from old.ronda_id
     or new.asignacion_id is distinct from old.asignacion_id
     or new.proyecto_requisito_id is distinct from old.proyecto_requisito_id
     or new.estado_proyecto_id is distinct from old.estado_proyecto_id
     or new.ambito        is distinct from old.ambito
     or new.severidad     is distinct from old.severidad
     or new.creada_por    is distinct from old.creada_por
     or new.creada_en     is distinct from old.creada_en then
    raise exception 'Las observaciones, su requisito, ambito y etapa son inmutables';
  end if;
  return new;
end;
$$;
