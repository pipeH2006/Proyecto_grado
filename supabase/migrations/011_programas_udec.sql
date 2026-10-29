-- 011_programas_udec.sql
-- Carga la oferta de pregrado vigente de la Universidad de Cundinamarca en el
-- catalogo `programas`, que alimenta el selector del formulario de anteproyecto.
--
-- Es idempotente: si el codigo ya existe, actualiza nombre/facultad y lo deja
-- activo. No desactiva programas que no esten en esta lista.

insert into programas (codigo, nombre, facultad, activo) values
  ('CON',        'Contaduría Pública',                                       'Ciencias Administrativas, Económicas y Contables', true),
  ('ADM',        'Administración de Empresas',                               'Ciencias Administrativas, Económicas y Contables', true),
  ('ZOO_UBATE',  'Zootecnia (Ubaté)',                                        'Ciencias Agropecuarias',                            true),
  ('ZOO_FUSAGA', 'Zootecnia (Fusagasugá)',                                   'Ciencias Agropecuarias',                            true),
  ('MVZ',        'Medicina Veterinaria y Zootecnia',                         'Ciencias Agropecuarias',                            true),
  ('ITG',        'Ingeniería Topográfica y Geomática',                       'Ciencias Agropecuarias',                            true),
  ('IAS',        'Ingeniería Ambiental',                                     'Ciencias Agropecuarias',                            true),
  ('IAG',        'Ingeniería Agronómica',                                    'Ciencias Agropecuarias',                            true),
  ('LEF',        'Licenciatura en Educación Física, Recreación y Deportes',  'Ciencias del Deporte y la Educación Física',        true),
  ('PCD',        'Profesional en Ciencias del Deporte',                      'Ciencias del Deporte y la Educación Física',        true),
  ('LCS',        'Licenciatura en Ciencias Sociales',                        'Educación',                                         true),
  ('IMC',        'Ingeniería Mecatrónica',                                   'Ingeniería',                                        true),
  ('ISW',        'Ingeniería de Software',                                   'Ingeniería',                                        true),
  ('ISC',        'Ingeniería de Sistemas y Computación',                     'Ingeniería',                                        true),
  ('IIN',        'Ingeniería Industrial',                                    'Ingeniería',                                        true),
  ('IEL',        'Ingeniería Electrónica',                                   'Ingeniería',                                        true),
  ('PSI',        'Psicología',                                               'Ciencias de la Salud',                              true),
  ('ENF',        'Enfermería',                                               'Ciencias de la Salud',                              true),
  ('MUS',        'Música',                                                   'Ciencias Sociales, Humanidades y Ciencias Políticas', true)
on conflict (codigo) do update set
  nombre   = excluded.nombre,
  facultad = excluded.facultad,
  activo   = excluded.activo;
