import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Credencial = {
  rol: "ESTUDIANTE" | "DOCENTE" | "COORDINADOR" | "ADMINISTRADOR";
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
};

function requerirPassword(variable: string): string {
  const valor = process.env[variable];
  if (!valor) {
    console.error(`Falta ${variable} en el entorno.`);
    process.exit(1);
  }
  return valor;
}

const CREDENCIALES: Credencial[] = [
  {
    rol: "ESTUDIANTE",
    email: "estudiante@udec.edu.co",
    password: requerirPassword("DEMO_PASSWORD_ESTUDIANTE"),
    nombres: "Estudiante",
    apellidos: "Demo",
  },
  {
    rol: "DOCENTE",
    email: "docente@udec.edu.co",
    password: requerirPassword("DEMO_PASSWORD_DOCENTE"),
    nombres: "Docente",
    apellidos: "Demo",
  },
  {
    rol: "COORDINADOR",
    email: "coordinador@udec.edu.co",
    password: requerirPassword("DEMO_PASSWORD_COORDINADOR"),
    nombres: "Coordinador",
    apellidos: "Demo",
  },
  {
    rol: "ADMINISTRADOR",
    email: "admin@udec.edu.co",
    password: requerirPassword("DEMO_PASSWORD_ADMIN"),
    nombres: "Administrador",
    apellidos: "Demo",
  },
];

async function buscarUsuarioPorEmail(
  email: string,
): Promise<{ id: string } | null> {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const encontrado = data.users.find(
      (usuario) => usuario.email?.toLowerCase() === email.toLowerCase(),
    );
    if (encontrado) return { id: encontrado.id };
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function asegurarPersona(
  userId: string,
  credencial: Credencial,
): Promise<string> {
  const { data: persona, error } = await supabase
    .from("persona")
    .select("id")
    .eq("usuario_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (persona) return persona.id;

  const { data: porEmail, error: errorEmail } = await supabase
    .from("persona")
    .select("id, usuario_id")
    .eq("email", credencial.email)
    .maybeSingle();
  if (errorEmail) throw errorEmail;

  if (porEmail) {
    if (porEmail.usuario_id !== userId) {
      const { error: vincularError } = await supabase
        .from("persona")
        .update({ usuario_id: userId })
        .eq("id", porEmail.id);
      if (vincularError) throw vincularError;
    }
    return porEmail.id;
  }

  const { data: nueva, error: insertError } = await supabase
    .from("persona")
    .insert({
      usuario_id: userId,
      nombres: credencial.nombres,
      apellidos: credencial.apellidos,
      email: credencial.email,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return nueva.id;
}

async function verificarLogin(
  email: string,
  password: string,
): Promise<string | null> {
  const anon = createClient<Database>(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.auth.signInWithPassword({ email, password });
  return error?.message ?? null;
}

async function main() {
  const { data: roles, error: rolesError } = await supabase
    .from("rol")
    .select("id, codigo");
  if (rolesError) throw rolesError;
  const rolPorCodigo = new Map((roles ?? []).map((rol) => [rol.codigo, rol.id]));

  for (const credencial of CREDENCIALES) {
    const { data: creado, error: crearError } = await supabase.auth.admin.createUser(
      {
        email: credencial.email,
        password: credencial.password,
        email_confirm: true,
        user_metadata: {
          given_name: credencial.nombres,
          family_name: credencial.apellidos,
        },
      },
    );

    let userId = creado.user?.id;
    if (crearError || !userId) {
      const existente = await buscarUsuarioPorEmail(credencial.email);
      if (!existente) {
        throw new Error(
          `No se pudo crear ni encontrar ${credencial.email}: ${crearError?.message ?? "usuario nulo"}`,
        );
      }
      userId = existente.id;
      const { error: actualizarError } =
        await supabase.auth.admin.updateUserById(userId, {
          password: credencial.password,
          email_confirm: true,
          user_metadata: {
            given_name: credencial.nombres,
            family_name: credencial.apellidos,
          },
        });
      if (actualizarError) throw actualizarError;
    }

    const personaId = await asegurarPersona(userId, credencial);

    const rolId = rolPorCodigo.get(credencial.rol);
    if (!rolId) throw new Error(`Rol ${credencial.rol} inexistente`);

    const { error: borrarError } = await supabase
      .from("persona_rol")
      .delete()
      .eq("persona_id", personaId);
    if (borrarError) throw borrarError;

    const { error: asignarError } = await supabase
      .from("persona_rol")
      .insert({ persona_id: personaId, rol_id: rolId });
    if (asignarError) throw asignarError;

    const loginError = await verificarLogin(
      credencial.email,
      credencial.password,
    );
    const estado = loginError ? `LOGIN FALLA: ${loginError}` : "login verificado";
    console.log(
      `${credencial.rol.padEnd(14)} ${credencial.email} / ${credencial.password}  (${estado})`,
    );
  }
}

main().catch((error) => {
  console.error("Fallo la creacion de credenciales:", error);
  process.exit(1);
});
