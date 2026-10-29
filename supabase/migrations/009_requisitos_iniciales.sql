-- 009_requisitos_iniciales.sql
-- Fase 3: requisitos por modalidad y checklist de cumplimiento por proyecto.
--
--   * Se cargan los requisitos por modalidad/etapa (vigentes desde 2020-01-01).
--   * Al registrar un proyecto se le crea su checklist de `proyecto_requisito`
--     en estado PENDIENTE (trigger), igual que fase 1.
--   * Helper para ubicar el proyecto_requisito del anteproyecto de un proyecto.

insert into modalidad_requisito
  (modalidad_id, requisito_id, etapa_id, obligatorio, orden, vigencia_desde)
select m.id, r.id, e.id, o.obligatorio, o.orden, date '2020-01-01'
from modalidad m
cross join (values
  ('FORM_INSCRIPCION','ANTEPROYECTO',1,true),
  ('ANTEPROYECTO','ANTEPROYECTO',2,true),
  ('CARTA_DIRECTOR','ANTEPROYECTO',3,true),
  ('ACTA_APROBACION','ANTEPROYECTO',4,false),
  ('DOC_FINAL','DESARROLLO',1,true),
  ('ACTA_SUSTENTACION','SUSTENTACION',1,true),
  ('PAZ_Y_SALVO','CIERRE',1,true)
) as o(requisito_codigo, etapa_codigo, orden, obligatorio)
join requisito r on r.codigo = o.requisito_codigo
join etapa e on e.codigo = o.etapa_codigo;

-- Checklist inicial al crear un proyecto.
create or replace function trg_proyecto_requisitos_iniciales() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_pendiente smallint;
begin
  select id into v_pendiente
    from estado_cumplimiento where codigo = 'PENDIENTE';

  insert into proyecto_requisito
    (proyecto_id, modalidad_requisito_id, estado_cumplimiento_id)
  select new.id, mr.id, v_pendiente
  from modalidad_requisito mr
  where mr.modalidad_id = new.modalidad_id
    and mr.vigencia @> current_date;

  return new;
end;
$$;

create trigger trg_proyecto_requisitos_iniciales
  after insert on proyectos
  for each row execute function trg_proyecto_requisitos_iniciales();

-- Backfill de los proyectos existentes.
insert into proyecto_requisito
  (proyecto_id, modalidad_requisito_id, estado_cumplimiento_id)
select p.id, mr.id, ec.id
from proyectos p
join modalidad_requisito mr
  on mr.modalidad_id = p.modalidad_id and mr.vigencia @> current_date
join estado_cumplimiento ec on ec.codigo = 'PENDIENTE'
on conflict (proyecto_id, modalidad_requisito_id) do nothing;

-- proyecto_requisito del anteproyecto de un proyecto (para enlazar el PDF).
create or replace function proyecto_requisito_anteproyecto(p_proyecto bigint)
returns bigint
language sql stable security definer set search_path = public, pg_temp as $$
  select pr.id
  from proyecto_requisito pr
  join modalidad_requisito mr on mr.id = pr.modalidad_requisito_id
  join requisito r on r.id = mr.requisito_id
  where pr.proyecto_id = p_proyecto and r.codigo = 'ANTEPROYECTO'
  limit 1;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on all functions in schema public to anon, authenticated;
  end if;
end
$$;
