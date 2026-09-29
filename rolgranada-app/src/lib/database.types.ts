export type EstadoPartida = "abierta" | "en_curso" | "finalizada";
export type EstadoDisponibilidad = "no_indicado" | "puedo" | "podria" | "no_puedo";
export type RolUsuario = "user" | "admin";

export type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: RolUsuario;
  created_at: string;
};

export type PartidaRow = {
  id: string;
  titulo: string;
  sistema: string;
  descripcion: string | null;
  imagen_url: string | null;
  dm_id: string;
  participantes_max: number;
  sesiones_al_mes: number;
  proxima_sesion: string | null;
  ubicacion_aproximada: string;
  ubicacion_exacta: string | null;
  notas_dm: string | null;
  estado: EstadoPartida;
  created_at: string;
};

export type PartidaParticipanteRow = {
  partida_id: string;
  user_id: string;
  fecha_union: string;
};

export type DisponibilidadRow = {
  id: string;
  user_id: string;
  fecha: string;
  manana: EstadoDisponibilidad;
  tarde: EstadoDisponibilidad;
};

export type SesionRow = {
  id: string;
  partida_id: string;
  fecha: string;
  franja: "manana" | "tarde";
  notas: string | null;
  imagen_url: string | null;
  created_at: string;
};

export type PartidaConAccesoRow = Omit<
  PartidaRow,
  "ubicacion_exacta" | "notas_dm" | "proxima_sesion"
> & {
  ubicacion_exacta: string | null;
  notas_dm: string | null;
  proxima_sesion: string | null;
  dm_username: string;
  dm_avatar_url: string | null;
  participantes_count: number;
  viewer_is_participant: boolean;
};

export type JugadorPartidaRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
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
        Insert: Omit<PartidaRow, "id" | "created_at" | "estado"> &
          Partial<
            Pick<
              PartidaRow,
              | "id"
              | "created_at"
              | "estado"
              | "sesiones_al_mes"
              | "proxima_sesion"
              | "notas_dm"
              | "ubicacion_exacta"
              | "descripcion"
              | "imagen_url"
            >
          >;
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
        Insert: Omit<DisponibilidadRow, "id"> & Partial<Pick<DisponibilidadRow, "id">>;
        Update: Partial<Omit<DisponibilidadRow, "id" | "user_id" | "fecha">>;
        Relationships: [];
      };
      sesiones: {
        Row: SesionRow;
        Insert: Omit<SesionRow, "id" | "created_at" | "imagen_url"> &
          Partial<Pick<SesionRow, "id" | "created_at" | "imagen_url">>;
        Update: Partial<Pick<SesionRow, "notas">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      listar_partidas: { Args: { [_ in never]: never }; Returns: PartidaConAccesoRow[] };
      unirse_partida: { Args: { p_partida_id: string }; Returns: undefined };
      listar_jugadores_partida: { Args: { p_partida_id: string }; Returns: JugadorPartidaRow[] };
      invitar_jugador_partida: { Args: { p_partida_id: string; p_username: string }; Returns: undefined };
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