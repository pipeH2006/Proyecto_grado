-- ---------------------------------------------------------------------------
-- 003: transiciones de estado de observacion segun el rol del actor.
--
-- 001 ya restringia el GRAFO de transiciones, pero no QUIEN puede hacer cada
-- salto: un autor podia enviar en_correccion -> solucionada por API. Como el
-- RLS es la fuente de verdad de los roles (no el cliente), se refina aqui:
--   * evaluador asignado vigente: en_correccion -> solucionada | no_aplica,
--     y reabrir solucionada -> pendiente.
--   * autor del proyecto: solo pendiente -> en_correccion.
--   * gestor (coordinador/admin): cualquier transicion valida del grafo.
--
-- Si no hay actor (service_role / seed), no se aplica el filtro de rol; sirve
-- para cargas administrativas.
-- ---------------------------------------------------------------------------
create or replace function validar_transicion_observacion() returns trigger
language plpgsql as $$
declare
  v_actor    uuid := persona_actual();
  v_asignado boolean;
  v_autor    boolean;
begin
  if new.estado is distinct from old.estado then
    if v_actor is not null and not es_gestor() then
      v_asignado := esta_asignado(new.proyecto_id);
      v_autor    := es_autor(new.proyecto_id);

      if v_asignado then
        if not (
          (old.estado = 'en_correccion' and new.estado in ('solucionada', 'no_aplica'))
          or (old.estado = 'solucionada' and new.estado = 'pendiente')
        ) then
          raise exception
            'El evaluador no puede mover la observacion % -> %', old.estado, new.estado;
        end if;
      elsif v_autor then
        if not (old.estado = 'pendiente' and new.estado = 'en_correccion') then
          raise exception
            'El autor solo puede mover pendiente -> en_correccion (intento % -> %)',
            old.estado, new.estado;
        end if;
      else
        raise exception 'Sin permisos para cambiar el estado de la observacion';
      end if;
    end if;

    if new.estado in ('solucionada', 'no_aplica') then
      new.cerrada_en := coalesce(new.cerrada_en, now());
      new.cerrada_por := coalesce(new.cerrada_por, v_actor);
    else
      new.cerrada_en := null;
      new.cerrada_por := null;
    end if;
  end if;
  return new;
end;
$$;
