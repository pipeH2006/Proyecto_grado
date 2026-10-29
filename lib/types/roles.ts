export type Rol = {
  id: number;
  codigo: string;
  nombre: string;
};

export type PersonaConRoles = {
  id: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  roles: string[];
};

export type Permiso = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  grupo: string;
  orden: number;
};

export type RolConPermisos = Rol & {
  permisos: string[];
};

export type DocenteOpcion = {
  id: string;
  nombres: string;
  apellidos: string;
  email: string | null;
};

export type OpcionProyecto = {
  id: number;
  titulo: string;
  estado: string;
};

export type AsignacionVista = {
  id: number;
  persona: { id: string; nombres: string; apellidos: string };
  rol_participacion: string;
  vigencia: string;
  vigente: boolean;
  creada_en: string;
};
