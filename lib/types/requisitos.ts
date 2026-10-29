export type DocumentoRequisito = {
  id: number;
  nombre_original: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  version: number;
  hash_sha256: string | null;
};

export type RequisitoVista = {
  proyecto_requisito_id: number;
  requisito_codigo: string;
  requisito_nombre: string;
  etapa: string;
  obligatorio: boolean;
  estado_codigo: string;
  estado_nombre: string;
  observacion: string | null;
  documentos: DocumentoRequisito[];
};
