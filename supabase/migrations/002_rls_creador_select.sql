-- ---------------------------------------------------------------------------
-- 002: el creador siempre puede leer su propio proyecto.
--
-- Motivo: el alta (Server Action) hace `.insert(...).select().single()`, que
-- usa RETURNING. Postgres evalua las politicas SELECT sobre la fila devuelta,
-- pero la fila de `proyecto_autores` la crea un trigger AFTER INSERT y todavia
-- no es visible en ese instante. Resultado: el alta fallaba con 42501 pese a
-- que el usuario tiene rol y `tiene_rol('estudiante')` es true.
--
-- Con esta politica la fila recien insertada es visible para quien la creo,
-- porque `creado_por` si viene en el propio INSERT.
-- ---------------------------------------------------------------------------
create policy proyectos_lectura_creador on proyectos
  for select to authenticated using (creado_por = persona_actual());
