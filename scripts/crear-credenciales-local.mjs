import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

function parseEnvOutput(output) {
  const variables = new Map();

  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) continue;

    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = JSON.parse(value);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    variables.set(match[1], value);
  }

  return variables;
}

const status = spawnSync(
  "npx.cmd",
  [
    "supabase",
    "status",
    "--output",
    "env",
    "--override-name",
    "api.url=NEXT_PUBLIC_SUPABASE_URL",
    "--workdir",
    process.cwd(),
  ],
  { encoding: "utf8", shell: true, windowsHide: true },
);

if (status.error || status.status !== 0) {
  console.error(
    "No se pudo leer Supabase local. Inicia Docker Desktop y ejecuta `npx.cmd supabase start`.",
  );
  process.exit(status.status || 1);
}

const variables = parseEnvOutput(status.stdout ?? "");
const localUrl = variables.get("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = variables.get("ANON_KEY");
const serviceRoleKey = variables.get("SERVICE_ROLE_KEY");

let parsedUrl;
try {
  parsedUrl = new URL(localUrl);
} catch {
  console.error("Supabase no devolvio una URL local valida.");
  process.exit(1);
}

if (
  !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
  parsedUrl.port !== "54421"
) {
  console.error(
    "Seguridad: la URL no es la instancia local esperada (127.0.0.1:54421). No se crearon cuentas.",
  );
  process.exit(1);
}

if (!anonKey || !serviceRoleKey) {
  console.error(
    "Supabase local no devolvio las claves necesarias. No se crearon cuentas.",
  );
  process.exit(1);
}

const password = () => `Loc-${randomBytes(24).toString("base64url")}-9a`;
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: localUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  DEMO_PASSWORD_ESTUDIANTE: password(),
  DEMO_PASSWORD_DOCENTE: password(),
  DEMO_PASSWORD_COORDINADOR: password(),
  DEMO_PASSWORD_ADMIN: password(),
};

const result = spawnSync(
  "npx.cmd",
  ["tsx", "scripts/crear-credenciales.ts"],
  { env, stdio: "inherit", shell: true, windowsHide: true },
);

if (result.error) {
  console.error(`No se pudo crear las cuentas locales: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
