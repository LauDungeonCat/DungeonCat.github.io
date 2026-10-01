export type EstadoPartida = "abierta" | "en_curso" | "finalizada";
export type EstadoDisponibilidad = "no_indicado" | "puedo" | "podria" | "no_puedo";
export type RolUsuario = "user" | "admin";

export type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: RolUsuario;
  created_at: string | null;
};

export type PartidaRow = {
  id: string;
  titulo: string;
  sistema: string;
  descripcion: string | null;
  imagen_url: string | null;
  dm_id: string | null;
  participantes_max: number | null;
  sesiones_al_mes: number | null;
  duracion_estimada: string | null;
  ubicacion_aproximada: string | null;
  ubicacion_exacta: string | null;
  es_privada: boolean;
  codigo_invitacion: string;
  estado: EstadoPartida | null;
  created_at: string | null;
};

export type PartidaParticipanteRow = {
  partida_id: string;
  user_id: string;
  estado: string | null;
  fecha_union: string | null;
};

export type DisponibilidadRow = {
  id: string;
  user_id: string;
  fecha: string;
  manana: EstadoDisponibilidad | null;
  tarde: EstadoDisponibilidad | null;
  created_at: string | null;
};

export type SesionRow = {
  id: string;
  partida_id: string;
  fecha: string;
  franja: "manana" | "tarde";
  created_at: string | null;
};

export type PartidaConAccesoRow = Omit<PartidaRow, "ubicacion_exacta" | "codigo_invitacion"> & {
  ubicacion_exacta: string | null;
  proxima_sesion: string | null;
  proxima_sesion_franja: "manana" | "tarde" | null;
  dm_username: string;
  dm_avatar_url: string | null;
  participantes_count: number;
  viewer_is_participant: boolean;
  viewer_has_requested: boolean;
  es_privada: boolean;
};

export type JugadorPartidaRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  fecha_union: string;
  dias_indicados: number;
  franjas_indicadas: number;
  franjas_sin_indicar: number;
};

export type SolicitudPartidaRow = {
  user_id: string;
  username: string;
  fecha_union: string;
};

export type DisponibilidadPartidaRow = {
  fecha: string;
  franja: "manana" | "tarde";
  participantes: number;
  pueden: number;
  podrian: number;
  no_pueden: number;
  no_indicado: number;
};

export type SesionUsuarioRow = SesionRow & {
  titulo_partida: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Pick<ProfileRow, "id" | "username"> &
          Partial<Pick<ProfileRow, "avatar_url" | "role" | "created_at">>;
        Update: Partial<Omit<ProfileRow, "id" | "created_at">>;
        Relationships: [];
      };
      partidas: {
        Row: PartidaRow;
        Insert: Pick<PartidaRow, "titulo" | "sistema"> & Partial<Omit<PartidaRow, "titulo" | "sistema">>;
        Update: Partial<Omit<PartidaRow, "id" | "created_at" | "dm_id">>;
        Relationships: [];
      };
      partida_participantes: {
        Row: PartidaParticipanteRow;
        Insert: Pick<PartidaParticipanteRow, "partida_id" | "user_id"> &
          Partial<Pick<PartidaParticipanteRow, "fecha_union">>;
        Update: Partial<Pick<PartidaParticipanteRow, "fecha_union">>;
        Relationships: [];
      };
      disponibilidades: {
        Row: DisponibilidadRow;
        Insert: Pick<DisponibilidadRow, "user_id" | "fecha"> & Partial<Omit<DisponibilidadRow, "user_id" | "fecha">>;
        Update: Partial<Omit<DisponibilidadRow, "id" | "user_id" | "fecha">>;
        Relationships: [];
      };
      sesiones: {
        Row: SesionRow;
        Insert: Omit<SesionRow, "id" | "created_at"> & Partial<Pick<SesionRow, "id" | "created_at">>;
        Update: Partial<Pick<SesionRow, "franja">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      listar_partidas: { Args: { [_ in never]: never }; Returns: PartidaConAccesoRow[] };
      unirse_partida: { Args: { p_partida_id: string }; Returns: undefined };
      listar_jugadores_partida: { Args: { p_partida_id: string }; Returns: JugadorPartidaRow[] };
      listar_solicitudes_partida: { Args: { p_partida_id: string }; Returns: SolicitudPartidaRow[] };
      invitar_jugador_partida: { Args: { p_partida_id: string; p_username: string }; Returns: undefined };
      solicitar_unirse_partida: { Args: { p_partida_id: string }; Returns: undefined };
      unirse_por_invitacion: { Args: { p_partida_id: string; p_codigo_invitacion: string }; Returns: undefined };
      resolver_solicitud_partida: { Args: { p_partida_id: string; p_user_id: string; p_aceptar: boolean }; Returns: undefined };
      obtener_codigo_invitacion: { Args: { p_partida_id: string }; Returns: string };
      echar_jugador_partida: { Args: { p_partida_id: string; p_user_id: string }; Returns: undefined };
      listar_disponibilidad_partida: {
        Args: { p_partida_id: string; p_inicio: string; p_fin: string };
        Returns: DisponibilidadPartidaRow[];
      };
      listar_sesiones_usuario: { Args: { [_ in never]: never }; Returns: SesionUsuarioRow[] };
    };
    Enums: {
      estado_disponibilidad: EstadoDisponibilidad;
    };
    CompositeTypes: { [_ in never]: never };
  };
};