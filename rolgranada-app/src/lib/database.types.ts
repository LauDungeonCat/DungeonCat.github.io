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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      disponibilidades: {
        Row: {
          created_at: string | null
          fecha: string
          id: string
          manana: Database["public"]["Enums"]["franja_estado"] | null
          tarde: Database["public"]["Enums"]["franja_estado"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fecha: string
          id?: string
          manana?: Database["public"]["Enums"]["franja_estado"] | null
          tarde?: Database["public"]["Enums"]["franja_estado"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fecha?: string
          id?: string
          manana?: Database["public"]["Enums"]["franja_estado"] | null
          tarde?: Database["public"]["Enums"]["franja_estado"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string
          id: string
          leida: boolean
          mensaje: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partida_participantes: {
        Row: {
          estado: string | null
          fecha_union: string | null
          partida_id: string
          user_id: string
        }
        Insert: {
          estado?: string | null
          fecha_union?: string | null
          partida_id: string
          user_id: string
        }
        Update: {
          estado?: string | null
          fecha_union?: string | null
          partida_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partida_participantes_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partida_participantes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas: {
        Row: {
          codigo_invitacion: string
          created_at: string | null
          descripcion: string | null
          dm_id: string | null
          duracion_estimada: string | null
          es_privada: boolean
          estado: string | null
          id: string
          imagen_url: string | null
          participantes_max: number | null
          sesiones_al_mes: number | null
          sistema: string
          titulo: string
          ubicacion_aproximada: string | null
          ubicacion_exacta: string | null
        }
        Insert: {
          codigo_invitacion?: string
          created_at?: string | null
          descripcion?: string | null
          dm_id?: string | null
          duracion_estimada?: string | null
          es_privada?: boolean
          estado?: string | null
          id?: string
          imagen_url?: string | null
          participantes_max?: number | null
          sesiones_al_mes?: number | null
          sistema: string
          titulo: string
          ubicacion_aproximada?: string | null
          ubicacion_exacta?: string | null
        }
        Update: {
          codigo_invitacion?: string
          created_at?: string | null
          descripcion?: string | null
          dm_id?: string | null
          duracion_estimada?: string | null
          es_privada?: boolean
          estado?: string | null
          id?: string
          imagen_url?: string | null
          participantes_max?: number | null
          sesiones_al_mes?: number | null
          sistema?: string
          titulo?: string
          ubicacion_aproximada?: string | null
          ubicacion_exacta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partidas_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_position: string | null
          avatar_url: string | null
          created_at: string | null
          estilo_master: string | null
          id: string
          lineas_evitar: string | null
          notif_email_activo: boolean | null
          notif_inapp_activo: boolean | null
          notif_push_activo: boolean | null
          pronombres: string | null
          rol_preferencias: Json | null
          role: string | null
          username: string
        }
        Insert: {
          avatar_position?: string | null
          avatar_url?: string | null
          created_at?: string | null
          estilo_master?: string | null
          id: string
          lineas_evitar?: string | null
          notif_email_activo?: boolean | null
          notif_inapp_activo?: boolean | null
          notif_push_activo?: boolean | null
          pronombres?: string | null
          rol_preferencias?: Json | null
          role?: string | null
          username: string
        }
        Update: {
          avatar_position?: string | null
          avatar_url?: string | null
          created_at?: string | null
          estilo_master?: string | null
          id?: string
          lineas_evitar?: string | null
          notif_email_activo?: boolean | null
          notif_inapp_activo?: boolean | null
          notif_push_activo?: boolean | null
          pronombres?: string | null
          rol_preferencias?: Json | null
          role?: string | null
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          created_at: string | null
          fecha: string
          franja: string
          id: string
          partida_id: string
        }
        Insert: {
          created_at?: string | null
          fecha: string
          franja: string
          id?: string
          partida_id: string
        }
        Update: {
          created_at?: string | null
          fecha?: string
          franja?: string
          id?: string
          partida_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crear_notificacion: {
        Args: { p_mensaje: string; p_titulo: string; p_user: string }
        Returns: undefined
      }
      echar_jugador_partida: {
        Args: { p_partida_id: string; p_user_id: string }
        Returns: undefined
      }
      invitar_jugador_partida: {
        Args: { p_partida_id: string; p_username: string }
        Returns: undefined
      }
      listar_disponibilidad_partida: {
        Args: { p_fin: string; p_inicio: string; p_partida_id: string }
        Returns: {
          fecha: string
          franja: string
          no_indicado: number
          no_pueden: number
          participantes: number
          podrian: number
          pueden: number
        }[]
      }
      listar_jugadores_partida: {
        Args: { p_partida_id: string }
        Returns: {
          avatar_url: string
          dias_indicados: number
          fecha_union: string
          franjas_indicadas: number
          franjas_sin_indicar: number
          user_id: string
          username: string
        }[]
      }
      listar_partidas: {
        Args: never
        Returns: {
          created_at: string
          descripcion: string
          dm_avatar_url: string
          dm_id: string
          dm_username: string
          duracion_estimada: string
          es_privada: boolean
          estado: string
          id: string
          imagen_url: string
          participantes_count: number
          participantes_max: number
          proxima_sesion: string
          proxima_sesion_franja: string
          sesiones_al_mes: number
          sistema: string
          titulo: string
          ubicacion_aproximada: string
          ubicacion_exacta: string
          viewer_has_requested: boolean
          viewer_is_participant: boolean
        }[]
      }
      listar_sesiones_usuario: {
        Args: never
        Returns: {
          created_at: string
          fecha: string
          franja: string
          id: string
          partida_id: string
          titulo_partida: string
        }[]
      }
      listar_solicitudes_partida: {
        Args: { p_partida_id: string }
        Returns: {
          fecha_union: string
          user_id: string
          username: string
        }[]
      }
      listar_solicitudes_usuario: {
        Args: never
        Returns: {
          fecha_union: string
          partida_id: string
          partida_titulo: string
          user_id: string
          username: string
        }[]
      }
      obtener_codigo_invitacion: {
        Args: { p_partida_id: string }
        Returns: string
      }
      resolver_solicitud_partida: {
        Args: { p_aceptar: boolean; p_partida_id: string; p_user_id: string }
        Returns: undefined
      }
      solicitar_unirse_partida: {
        Args: { p_partida_id: string }
        Returns: undefined
      }
      unirse_partida: { Args: { p_partida_id: string }; Returns: undefined }
      unirse_por_invitacion: {
        Args: { p_codigo_invitacion: string; p_partida_id: string }
        Returns: undefined
      }
    }
    Enums: {
      franja_estado: "no_indicado" | "puedo" | "podria" | "no_puedo"
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
  public: {
    Enums: {
      franja_estado: ["no_indicado", "puedo", "podria", "no_puedo"],
    },
  },
} as const

/// --- TIPOS AUXILIARES SEGUROS PARA COMPONENTES ---

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  notif_email_activo?: boolean | null;
  notif_inapp_activo?: boolean | null;
  notif_push_activo?: boolean | null;
};

export type JugadorPartidaRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role?: string;
  fecha_union?: string;
  franjas_indicadas?: number;
  franjas_sin_indicar?: number;
};

export type SesionUsuarioRow = {
  id: string;
  partida_id: string;
  fecha: string;
  franja: "manana" | "tarde" | string;
  titulo_partida?: string;
  created_at?: string | null;
};

export type DisponibilidadPartidaRow = {
  fecha: string;
  franja: string;
  pueden: number;
  podrian: number;
  no_pueden: number;
  no_indicado: number;
  participantes: number;
};