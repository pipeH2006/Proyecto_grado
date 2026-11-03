select
  current_setting('TimeZone') as zona_horaria_db,
  now() as ahora_db,
  s.solicitada_en,
  s.confirmada_en,
  r.abierta_en,
  (s.confirmada_en <= r.abierta_en) as confirmada_antes_de_apertura,
  pg_get_functiondef(
    'public.abrir_ronda_sustentacion(bigint)'::regprocedure
  ) like '%PENDIENTE_JURADO%' as funcion_exige_solicitud_confirmada
from solicitudes_sustentacion s
join rondas r on r.proyecto_id = s.proyecto_id
where s.proyecto_id = 1
  and r.id = 1;