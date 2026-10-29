export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      asignaciones: {
        Row: {
          creada_en: string
          creada_por: string | null
          id: number
          persona_id: string
          proyecto_id: number
          rol_participacion_id: number
          vigencia: unknown
        }
        Insert: {
          creada_en?: string
          creada_por?: string | null
          id?: never
          persona_id: string
          proyecto_id: number
          rol_participacion_id: number
          vigencia?: unknown
        }
        Update: {
          creada_en?: string
          creada_por?: string | null
          id?: never
          persona_id?: string
          proyecto_id?: number
          rol_participacion_id?: number
          vigencia?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_requisitos_pendientes"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "asignaciones_rol_participacion_id_fkey"
            columns: ["rol_participacion_id"]
            isOneToOne: false
            referencedRelation: "rol_participacion"
            referencedColumns: ["id"]
          },
        ]
      }
      docente: {
        Row: {
          persona_id: string
          unidad: string | null
          vinculacion: string | null
        }
        Insert: {
          persona_id: string
          unidad?: string | null
          vinculacion?: string | null
        }
        Update: {
          persona_id?: string
          unidad?: string | null
          vinculacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docente_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: true
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          creado_en: string
          hash_sha256: string | null
          id: number
          mime_type: string | null
          nombre_original: string
          proyecto_id: number
          proyecto_requisito_id: number | null
          respuesta_id: number | null
          storage_bucket: string
          storage_path: string
          subido_por: string | null
          tamano_bytes: number | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          version: number
        }
        Insert: {
          creado_en?: string
          hash_sha256?: string | null
          id?: never
          mime_type?: string | null
          nombre_original: string
          proyecto_id: number
          proyecto_requisito_id?: number | null
          respuesta_id?: number | null
          storage_bucket?: string
          storage_path: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          version?: number
        }
        Update: {
          creado_en?: string
          hash_sha256?: string | null
          id?: never
          mime_type?: string | null
          nombre_original?: string
          proyecto_id?: number
          proyecto_requisito_id?: number | null
          respuesta_id?: number | null
          storage_bucket?: string
          storage_path?: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_requisitos_pendientes"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "documentos_proyecto_requisito_id_fkey"
            columns: ["proyecto_requisito_id"]
            isOneToOne: false
            referencedRelation: "proyecto_requisito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_respuesta_id_fkey"
            columns: ["respuesta_id"]
            isOneToOne: false
            referencedRelation: "respuestas_observacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      estado: {
        Row: {
          codigo: string
          es_final: boolean
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          codigo: string
          es_final?: boolean
          id?: number
          nombre: string
          orden: number
        }
        Update: {
          codigo?: string
          es_final?: boolean
          id?: number
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      estado_cumplimiento: {
        Row: {
          codigo: string
          id: number
          nombre: string
        }
        Insert: {
          codigo: string
          id?: number
          nombre: string
        }
        Update: {
          codigo?: string
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      estudiante: {
        Row: {
          codigo: string
          persona_id: string
          semestre: number | null
        }
        Insert: {
          codigo: string
          persona_id: string
          semestre?: number | null
        }
        Update: {
          codigo?: string
          persona_id?: string
          semestre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estudiante_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: true
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa: {
        Row: {
          codigo: string
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          codigo: string
          id?: number
          nombre: string
          orden: number
        }
        Update: {
          codigo?: string
          id?: number
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      eventos_observacion: {
        Row: {
          actor_id: string | null
          estado_anterior:
            | Database["public"]["Enums"]["estado_observacion"]
            | null
          estado_nuevo: Database["public"]["Enums"]["estado_observacion"]
          id: number
          nota: string | null
          observacion_id: number
          ocurrido_en: string
        }
        Insert: {
          actor_id?: string | null
          estado_anterior?:
            | Database["public"]["Enums"]["estado_observacion"]
            | null
          estado_nuevo: Database["public"]["Enums"]["estado_observacion"]
          id?: never
          nota?: string | null
          observacion_id: number
          ocurrido_en?: string
        }
        Update: {
          actor_id?: string | null
          estado_anterior?:
            | Database["public"]["Enums"]["estado_observacion"]
            | null
          estado_nuevo?: Database["public"]["Enums"]["estado_observacion"]
          id?: never
          nota?: string | null
          observacion_id?: number
          ocurrido_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_observacion_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_observacion_observacion_id_fkey"
            columns: ["observacion_id"]
            isOneToOne: false
            referencedRelation: "observaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      modalidad: {
        Row: {
          activa: boolean
          codigo: string
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          activa?: boolean
          codigo: string
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          activa?: boolean
          codigo?: string
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      modalidad_requisito: {
        Row: {
          etapa_id: number
          id: number
          modalidad_id: number
          obligatorio: boolean
          orden: number
          requisito_id: number
          vigencia: unknown
          vigencia_desde: string
          vigencia_hasta: string | null
        }
        Insert: {
          etapa_id: number
          id?: never
          modalidad_id: number
          obligatorio?: boolean
          orden?: number
          requisito_id: number
          vigencia?: unknown
          vigencia_desde: string
          vigencia_hasta?: string | null
        }
        Update: {
          etapa_id?: number
          id?: never
          modalidad_id?: number
          obligatorio?: boolean
          orden?: number
          requisito_id?: number
          vigencia?: unknown
          vigencia_desde?: string
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modalidad_requisito_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modalidad_requisito_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modalidad_requisito_requisito_id_fkey"
            columns: ["requisito_id"]
            isOneToOne: false
            referencedRelation: "requisito"
            referencedColumns: ["id"]
          },
        ]
      }
      observaciones: {
        Row: {
          asignacion_id: number
          cerrada_en: string | null
          cerrada_por: string | null
          creada_en: string
          creada_por: string
          estado: Database["public"]["Enums"]["estado_observacion"]
          id: number
          proyecto_id: number
          ronda_id: number
          severidad: Database["public"]["Enums"]["severidad"]
          texto: string
        }
        Insert: {
          asignacion_id: number
          cerrada_en?: string | null
          cerrada_por?: string | null
          creada_en?: string
          creada_por: string
          estado?: Database["public"]["Enums"]["estado_observacion"]
          id?: never
          proyecto_id: number
          ronda_id: number
          severidad?: Database["public"]["Enums"]["severidad"]
          texto: string
        }
        Update: {
          asignacion_id?: number
          cerrada_en?: string | null
          cerrada_por?: string | null
          creada_en?: string
          creada_por?: string
          estado?: Database["public"]["Enums"]["estado_observacion"]
          id?: never
          proyecto_id?: number
          ronda_id?: number
          severidad?: Database["public"]["Enums"]["severidad"]
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "observaciones_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observaciones_cerrada_por_fkey"
            columns: ["cerrada_por"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observaciones_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_requisitos_pendientes"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "observaciones_ronda_id_fkey"
            columns: ["ronda_id"]
            isOneToOne: false
            referencedRelation: "rondas"
            referencedColumns: ["id"]
          },
        ]
      }
      periodo_academico: {
        Row: {
          anio: number
          fecha_fin: string | null
          fecha_inicio: string | null
          id: number
          semestre: number
        }
        Insert: {
          anio: number
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: number
          semestre: number
        }
        Update: {
          anio?: number
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: number
          semestre?: number
        }
        Relationships: []
      }
      permiso: {
        Row: {
          codigo: string
          descripcion: string | null
          grupo: string
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          codigo: string
          descripcion?: string | null
          grupo: string
          id?: number
          nombre: string
          orden?: number
        }
        Update: {
          codigo?: string
          descripcion?: string | null
          grupo?: string
          id?: number
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      persona: {
        Row: {
          actualizado_en: string
          apellidos: string
          creado_en: string
          documento: string | null
          email: string | null
          id: string
          nombres: string
          numero_documento: string | null
          telefono: string | null
          tipo_documento: string | null
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string
          apellidos?: string
          creado_en?: string
          documento?: string | null
          email?: string | null
          id?: string
          nombres: string
          numero_documento?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string
          apellidos?: string
          creado_en?: string
          documento?: string | null
          email?: string | null
          id?: string
          nombres?: string
          numero_documento?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      persona_rol: {
        Row: {
          creado_en: string
          persona_id: string
          rol_id: number
        }
        Insert: {
          creado_en?: string
          persona_id: string
          rol_id: number
        }
        Update: {
          creado_en?: string
          persona_id?: string
          rol_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "persona_rol_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_rol_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_sede: {
        Row: {
          activa: boolean
          programa_id: number
          sede_id: number
        }
        Insert: {
          activa?: boolean
          programa_id: number
          sede_id: number
        }
        Update: {
          activa?: boolean
          programa_id?: number
          sede_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "programa_sede_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_sede_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
        ]
      }
      programas: {
        Row: {
          activo: boolean
          codigo: string
          creado_en: string
          facultad: string | null
          id: number
          nombre: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          creado_en?: string
          facultad?: string | null
          id?: number
          nombre: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          creado_en?: string
          facultad?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      proyecto_autores: {
        Row: {
          creado_en: string
          es_principal: boolean
          id: number
          orden: number
          persona_id: string
          proyecto_id: number
        }
        Insert: {
          creado_en?: string
          es_principal?: boolean
          id?: never
          orden?: number
          persona_id: string
          proyecto_id: number
        }
        Update: {
          creado_en?: string
          es_principal?: boolean
          id?: never
          orden?: number
          persona_id?: string
          proyecto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_autores_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_autores_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_autores_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_requisitos_pendientes"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      proyecto_estado_hist: {
        Row: {
          estado_id: number
          fecha: string
          id: number
          observacion: string | null
          proyecto_id: number
          usuario_id: string | null
        }
        Insert: {
          estado_id: number
          fecha?: string
          id?: number
          observacion?: string | null
          proyecto_id: number
          usuario_id?: string | null
        }
        Update: {
          estado_id?: number
          fecha?: string
          id?: number
          observacion?: string | null
          proyecto_id?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_estado_hist_estado_id_fkey"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_estado_hist_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_estado_hist_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_requisitos_pendientes"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_estado_hist_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_requisito: {
        Row: {
          estado_cumplimiento_id: number
          fecha_cumplimiento: string | null
          id: number
          modalidad_requisito_id: number
          observacion: string | null
          proyecto_id: number
          verificado_por: string | null
        }
        Insert: {
          estado_cumplimiento_id: number
          fecha_cumplimiento?: string | null
          id?: never
          modalidad_requisito_id: number
          observacion?: string | null
          proyecto_id: number
          verificado_por?: string | null
        }
        Update: {
          estado_cumplimiento_id?: number
          fecha_cumplimiento?: string | null
          id?: never
          modalidad_requisito_id?: number
          observacion?: string | null
          proyecto_id?: number
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_requisito_estado_cumplimiento_id_fkey"
            columns: ["estado_cumplimiento_id"]
            isOneToOne: false
            referencedRelation: "estado_cumplimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_requisito_modalidad_requisito_id_fkey"
            columns: ["modalidad_requisito_id"]
            isOneToOne: false
            referencedRelation: "modalidad_requisito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_requisito_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_requisito_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_requisitos_pendientes"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_requisito_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_tesauro: {
        Row: {
          proyecto_id: number
          tesauro_id: number
        }
        Insert: {
          proyecto_id: number
          tesauro_id: number
        }
        Update: {
          proyecto_id?: number
          tesauro_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_tesauro_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tesauro_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_requisitos_pendientes"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_tesauro_tesauro_id_fkey"
            columns: ["tesauro_id"]
            isOneToOne: false
            referencedRelation: "tesauro"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          actualizado_en: string
          busqueda: unknown
          creado_en: string
          creado_por: string | null
          estado_actual_id: number
          fecha_finalizacion: string | null
          fecha_radicacion: string | null
          fecha_sustentacion: string | null
          id: number
          modalidad_id: number
          palabras_clave: string[]
          periodo_id: number
          programa_id: number
          resumen: string | null
          sede_id: number | null
          titulo: string
        }
        Insert: {
          actualizado_en?: string
          busqueda?: unknown
          creado_en?: string
          creado_por?: string | null
          estado_actual_id?: number
          fecha_finalizacion?: string | null
          fecha_radicacion?: string | null
          fecha_sustentacion?: string | null
          id?: never
          modalidad_id: number
          palabras_clave?: string[]
          periodo_id: number
          programa_id: number
          resumen?: string | null
          sede_id?: number | null
          titulo: string
        }
        Update: {
          actualizado_en?: string
          busqueda?: unknown
          creado_en?: string
          creado_por?: string | null
          estado_actual_id?: number
          fecha_finalizacion?: string | null
          fecha_radicacion?: string | null
          fecha_sustentacion?: string | null
          id?: never
          modalidad_id?: number
          palabras_clave?: string[]
          periodo_id?: number
          programa_id?: number
          resumen?: string | null
          sede_id?: number | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_estado_actual_id_fkey"
            columns: ["estado_actual_id"]
            isOneToOne: false
            referencedRelation: "estado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodo_academico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
        ]
      }
      requisito: {
        Row: {
          codigo: string
          descripcion: string | null
          id: number
          nombre: string
          tipo_evidencia: string
        }
        Insert: {
          codigo: string
          descripcion?: string | null
          id?: never
          nombre: string
          tipo_evidencia?: string
        }
        Update: {
          codigo?: string
          descripcion?: string | null
          id?: never
          nombre?: string
          tipo_evidencia?: string
        }
        Relationships: []
      }
      respuestas_observacion: {
        Row: {
          autor_id: string
          creada_en: string
          id: number
          observacion_id: number
          texto: string
        }
        Insert: {
          autor_id: string
          creada_en?: string
          id?: never
          observacion_id: number
          texto: string
        }
        Update: {
          autor_id?: string
          creada_en?: string
          id?: never
          observacion_id?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_observacion_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_observacion_observacion_id_fkey"
            columns: ["observacion_id"]
            isOneToOne: false
            referencedRelation: "observaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      rol: {
        Row: {
          codigo: string
          id: number
          nombre: string
        }
        Insert: {
          codigo: string
          id?: number
          nombre: string
        }
        Update: {
          codigo?: string
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      rol_participacion: {
        Row: {
          codigo: string
          id: number
          nombre: string
        }
        Insert: {
          codigo: string
          id?: number
          nombre: string
        }
        Update: {
          codigo?: string
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      rol_permiso: {
        Row: {
          permiso_id: number
          rol_id: number
        }
        Insert: {
          permiso_id: number
          rol_id: number
        }
        Update: {
          permiso_id?: number
          rol_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rol_permiso_permiso_id_fkey"
            columns: ["permiso_id"]
            isOneToOne: false
            referencedRelation: "permiso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rol_permiso_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id"]
          },
        ]
      }
      rondas: {
        Row: {
          abierta_en: string
          abierta_por: string | null
          cerrada_en: string | null
          id: number
          numero: number
          proyecto_id: number
        }
        Insert: {
          abierta_en?: string
          abierta_por?: string | null
          cerrada_en?: string | null
          id?: never
          numero: number
          proyecto_id: number
        }
        Update: {
          abierta_en?: string
          abierta_por?: string | null
          cerrada_en?: string | null
          id?: never
          numero?: number
          proyecto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rondas_abierta_por_fkey"
            columns: ["abierta_por"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rondas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rondas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_requisitos_pendientes"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      sede: {
        Row: {
          activa: boolean
          codigo: string
          id: number
          nombre: string
          tipo: string
        }
        Insert: {
          activa?: boolean
          codigo: string
          id?: number
          nombre: string
          tipo: string
        }
        Update: {
          activa?: boolean
          codigo?: string
          id?: number
          nombre?: string
          tipo?: string
        }
        Relationships: []
      }
      tesauro: {
        Row: {
          activo: boolean
          creado_en: string
          descripcion: string | null
          id: number
          programa_id: number | null
          sinonimos: string[]
          termino: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          descripcion?: string | null
          id?: never
          programa_id?: number | null
          sinonimos?: string[]
          termino: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          descripcion?: string | null
          id?: never
          programa_id?: number | null
          sinonimos?: string[]
          termino?: string
        }
        Relationships: [
          {
            foreignKeyName: "tesauro_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
        ]
      }
      transicion_estado: {
        Row: {
          estado_destino_id: number
          estado_origen_id: number
          id: number
          rol_autorizado_id: number
        }
        Insert: {
          estado_destino_id: number
          estado_origen_id: number
          id?: number
          rol_autorizado_id: number
        }
        Update: {
          estado_destino_id?: number
          estado_origen_id?: number
          id?: number
          rol_autorizado_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "transicion_estado_estado_destino_id_fkey"
            columns: ["estado_destino_id"]
            isOneToOne: false
            referencedRelation: "estado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transicion_estado_estado_origen_id_fkey"
            columns: ["estado_origen_id"]
            isOneToOne: false
            referencedRelation: "estado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transicion_estado_rol_autorizado_id_fkey"
            columns: ["rol_autorizado_id"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_requisitos_pendientes: {
        Row: {
          estado_cumplimiento: string | null
          etapa: string | null
          modalidad: string | null
          obligatorio: boolean | null
          proyecto_id: number | null
          requisito: string | null
          titulo: string | null
        }
        Relationships: []
      }
      v_resumen_periodo: {
        Row: {
          anio: number | null
          estado: string | null
          modalidad: string | null
          semestre: number | null
          total_proyectos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      asignar_participacion: {
        Args: {
          p_persona: string
          p_proyecto: number
          p_rol_participacion: number
        }
        Returns: number
      }
      buscar_antecedentes: {
        Args: {
          consulta: string
          limite?: number
          p_periodo?: string
          p_programa?: number
        }
        Returns: {
          fecha_finalizacion: string
          id: number
          palabras_clave: string[]
          periodo: string
          programa_id: number
          resumen: string
          score: number
          titulo: string
        }[]
      }
      documento_proyecto_id: { Args: { p_name: string }; Returns: number }
      es_admin: { Args: never; Returns: boolean }
      es_autor: { Args: { p_proyecto: number }; Returns: boolean }
      es_gestor: { Args: never; Returns: boolean }
      esta_asignado: { Args: { p_proyecto: number }; Returns: boolean }
      estado_id: { Args: { p_codigo: string }; Returns: number }
      mis_permisos: { Args: never; Returns: string[] }
      persona_actual: { Args: never; Returns: string }
      proyecto_de_observacion: {
        Args: { p_observacion: number }
        Returns: number
      }
      proyecto_requisito_anteproyecto: {
        Args: { p_proyecto: number }
        Returns: number
      }
      puede_ver_proyecto: { Args: { p_proyecto: number }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      tiene_permiso: { Args: { p_codigo: string }; Returns: boolean }
      tiene_rol: { Args: { p_rol: string }; Returns: boolean }
    }
    Enums: {
      estado_observacion:
        | "pendiente"
        | "en_correccion"
        | "solucionada"
        | "no_aplica"
      severidad: "baja" | "media" | "alta"
      tipo_documento: "anteproyecto" | "anexo" | "evidencia" | "acta" | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_observacion: [
        "pendiente",
        "en_correccion",
        "solucionada",
        "no_aplica",
      ],
      severidad: ["baja", "media", "alta"],
      tipo_documento: ["anteproyecto", "anexo", "evidencia", "acta", "otro"],
    },
  },
} as const
