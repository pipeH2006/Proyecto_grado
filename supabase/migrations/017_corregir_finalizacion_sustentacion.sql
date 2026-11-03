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
