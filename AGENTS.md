# Contexto del proyecto — sistema de anteproyectos

## Qué es este sistema

Dos subsistemas que comparten una sola base de datos PostgreSQL:

1. **Repositorio / catálogo** — histórico de proyectos de grado ya presentados,
   buscable por palabras clave. Público para consulta sin autenticación.
2. **Flujo de evaluación de anteproyectos** — observaciones versionadas por
   ronda, estados por observación, trazabilidad cuando rotan los evaluadores.

El segundo subsistema es el que ninguna herramienta de repositorio da bien.
Es la parte diferencial del trabajo y donde está la mayor complejidad de negocio.

---

## Stack técnico

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 15 · App Router | Un solo repo, SSR para catálogo público, Server Actions para workflow |
| Lenguaje | TypeScript estricto | `strict: true`, sin `any` |
| Base de datos | PostgreSQL 16 vía Supabase | Esquema en `supabase/migrations/` |
| Auth | Supabase Auth | Proveedor Google + Microsoft 365, sin passwords propios |
| Archivos | Supabase Storage | PDFs con políticas ligadas a la DB |
| UI | shadcn/ui + Tailwind CSS v4 | Componentes en `components/ui/` |
| Estado servidor | TanStack Query v5 | `invalidateQueries` después de cada mutación |
| Formularios | react-hook-form + zod | `zodResolver`, validación en cliente y servidor |
| Email | Resend | Notificaciones de cambios de estado (RF-09) |
| Despliegue | Vercel + Supabase | Alternativa on-premise: Docker Compose |

---

## Estructura de carpetas

```
/
├── app/
│   ├── (public)/                   ← catálogo y búsqueda (SSG/ISR, sin auth)
│   │   ├── page.tsx                ← home + búsqueda pública
│   │   └── proyectos/[id]/page.tsx ← vista de un proyecto finalizado
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── dashboard/
│   │   ├── estudiante/             ← subir proyecto, responder observaciones
│   │   ├── evaluador/              ← ver asignados, cargar observaciones
│   │   └── coordinador/            ← asignar evaluadores, abrir rondas, tesauro
│   └── api/
│       └── webhooks/               ← solo lo que necesite URL pública
├── components/
│   ├── ui/                         ← generado por shadcn/ui, no editar a mano
│   └── domain/                     ← ObservacionCard, EstadoBadge, RondaTimeline…
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← createBrowserClient()
│   │   ├── server.ts               ← createServerClient() (solo Server Components)
│   │   └── middleware.ts           ← refresca sesión en cada request
│   ├── types/
│   │   └── database.ts             ← generado: supabase gen types typescript
│   └── validations/
│       ├── proyecto.ts             ← zod schema de proyectos
│       └── observacion.ts         ← zod schema de observaciones
├── workers/
│   └── embed.py                    ← worker Python para pgvector (proceso aparte)
└── supabase/
    ├── migrations/
    │   └── 001_schema_inicial.sql  ← esquema completo (ver sección DB abajo)
    └── seed.ts
```

---

## Base de datos — entidades clave

El esquema base está en `supabase/migrations/001_schema_inicial.sql` y la
reconciliación con el esquema de fase 1 (roles/catálogos, `persona`) en
`supabase/migrations/005_reconciliacion_fase1.sql`.
Aquí están las decisiones no obvias que hay que respetar al escribir código:

### `persona` ≠ `auth.users`
Los autores históricos no tienen cuenta. `persona.usuario_id` es nullable y se
vincula cuando alguien hace login por primera vez. **Nunca referenciar
`auth.users` directamente desde lógica de negocio**; usar siempre `persona`.

```sql
-- Para obtener la persona del usuario actual:
select * from persona where usuario_id = auth.uid();
-- O usar la función ya definida:
select persona_actual();
```

### Roles: catálogo `rol` + `persona_rol` (reconciliado con fase 1)
El rol del usuario ya no es un enum: es el catálogo `rol`
(COORDINADOR/DOCENTE/ESTUDIANTE/ADMINISTRADOR) sobre la tabla puente
`persona_rol`. `tiene_rol(codigo text)` recibe el código en mayúsculas.

El rol **dentro de un proyecto** (DIRECTOR/EVALUADOR/JURADO…) es otro catálogo,
`rol_participacion`, y vive en `asignaciones.rol_participacion_id`.

### Permisos: catálogo `permiso` + `rol_permiso`
Los permisos son datos, no código: `permiso` define códigos como
`proyecto.crear` u `observacion.evaluar`, y `rol_permiso` es la matriz rol ×
permiso editable desde `/dashboard/coordinador/permisos`.

```sql
tiene_permiso('proyecto.crear') -- boolean, permiso efectivo del usuario actual
mis_permisos()                  -- text[], todos los permisos del usuario
```

`ADMINISTRADOR` siempre pasa `tiene_permiso()` (bypass anti-bloqueo); el resto
depende de la matriz. Las políticas RLS usan `tiene_permiso`, no `es_gestor()`.
`es_gestor()` queda solo para navegación y guards de panel en TypeScript.

### `asignaciones.vigencia` es un `daterange`, no un booleano
Cuando cambia el evaluador, se cierra el rango y se abre otro. Nunca hacer
`UPDATE asignaciones SET activo = false`. En cambio:

```sql
-- Cerrar asignación vigente:
UPDATE asignaciones
SET vigencia = daterange(lower(vigencia), current_date, '[)')
WHERE proyecto_id = $1 AND persona_id = $2 AND upper_inf(vigencia);

-- Crear nueva asignación:
INSERT INTO asignaciones (proyecto_id, persona_id, rol_participacion_id, vigencia)
VALUES ($1, $3, $4, daterange(current_date, null, '[)'));
```

### `observaciones` son inmutables
El trigger `trg_observacion_inmutable` rechaza cualquier UPDATE que cambie
`texto`, `ronda_id`, `asignacion_id` o `severidad`. Solo puede moverse `estado`,
`cerrada_por` y `cerrada_en`. No intentar workarounds; si un evaluador necesita
corregir una observación, crea una nueva en la misma ronda.

### Enums de estado
Los posibles estados de una observación son exactamente:
`pendiente → en_correccion → solucionada | no_aplica`

El evaluador puede reabrir de `solucionada` a `pendiente`. El estudiante solo
puede mover de `pendiente` a `en_correccion`.

### Seguridad: RLS está activo
Las tablas `proyectos`, `observaciones`, `documentos` y `respuestas_observacion`
tienen RLS habilitado. Las funciones de ayuda ya definidas son:

```sql
persona_actual()      -- uuid de la persona del usuario actual
tiene_rol(codigo)     -- boolean, verifica un rol del catalogo por su codigo
tiene_permiso(codigo) -- boolean, permiso efectivo (ADMINISTRADOR siempre true)
es_autor(proyecto_id) -- boolean
esta_asignado(proyecto_id) -- boolean (solo vigente hoy)
```

Usar el cliente de servicio (`createClient` con `service_role`) solo en Server
Actions de coordinador o admin, nunca en Client Components.

---

## Búsqueda

La función `buscar_antecedentes(consulta text, p_programa smallint, limite int)`
ya está definida en la base de datos. Retorna proyectos por full-text +
trigramas combinados con RRF. Llamarla desde el Server Component del catálogo:

```typescript
const { data } = await supabase
  .rpc('buscar_antecedentes', { consulta: query, limite: 20 })
```

Para la fase 2 (similitud semántica), ver `workers/embed.py` y la función
`buscar_hibrido` en `capa_neuronal_antecedentes.md`.

---

## Generación de tipos TypeScript

Siempre regenerar los tipos después de una migración:

```bash
supabase gen types typescript --project-id <PROJECT_ID> \
  > lib/types/database.ts
```

No editar `database.ts` a mano.

---

## Base de datos local

`supabase db reset` **no siembra**: el seed vive en `supabase/seed.ts` y corre con
el service_role (`config.toml` tiene `[db.seed] enabled = false`). Para resetear
y sembrar en un solo paso:

```bash
npm run db:reset
```

---

## Convenciones de código

- **Server Actions en `app/`**: archivos que empiezan con `'use server'`,
  un archivo por módulo de dominio (`actions/observaciones.ts`,
  `actions/proyectos.ts`).
- **Validación doble**: el mismo schema Zod valida tanto en el cliente
  (react-hook-form) como al inicio del Server Action, antes de tocar la DB.
- **Errores tipados**: las Server Actions retornan `{ data, error }`,
  nunca hacen `throw`; el cliente chequea `error` antes de usar `data`.
- **`invalidateQueries`**: después de cada mutación exitosa, invalidar la query
  correspondiente. Las claves de query van en `lib/queryKeys.ts`.
- **Tailwind**: mobile-first, `dark:` para modo oscuro, sin inline styles.
  Paleta de la universidad en `tailwind.config.ts`.
- **shadcn/ui**: no editar los archivos de `components/ui/` generados;
  extender con `components/domain/`.

---

## Requerimientos funcionales de referencia rápida

| ID | Descripción | Estado |
|---|---|---|
| RF-01 | Registrar proyecto con metadatos | Pendiente |
| RF-02 | Búsqueda full-text + filtros | Pendiente |
| RF-03 | Detección de antecedentes similares | Pendiente |
| RF-04 | Asignar evaluadores con vigencia | Pendiente |
| RF-05 | Observaciones por ronda | Pendiente |
| RF-06 | Estado por observación (pendiente/en_correccion/solucionada/no_aplica) | Pendiente |
| RF-07 | Estudiante responde observación con evidencia | Pendiente |
| RF-08 | Historial inmutable | ✅ En DB (triggers) |
| RF-09 | Notificaciones por correo | Pendiente |
| RF-10 | Carga masiva de proyectos históricos | Pendiente |

**MVP**: RF-01 + RF-02 + RF-05 + RF-06. Nada más hasta que esos cuatro funcionen end-to-end.

---

## Lo que no se debe hacer

- No usar `localStorage` para guardar tokens o estado de sesión.
- No duplicar la lógica de roles en el cliente; el RLS de Postgres es la
  fuente de verdad.
- No usar Prisma ni ningún ORM; el cliente de Supabase + tipos generados
  son suficientes y respetan los triggers y funciones de la DB.
- No hacer `DELETE` en `observaciones` ni `eventos_observacion`; el trigger
  lo bloquea y lanzará excepción.
- No invocar el worker de Python desde Next.js en tiempo de request;
  el worker es asíncrono y consume la cola `embeddings_pendientes`.
