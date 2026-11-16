import type { Database } from "./database.types";
import type {
  EstadisticasUsuario,
  DatosAmistad,
  EventoComunidad,
} from "../types";
import type { SesionUsuarioRow } from "./database.helpers";

type TablaPartidasConAccesoAmistades = Database["public"]["Tables"]["partidas"] & {
  Row: Database["public"]["Tables"]["partidas"]["Row"] & { amigos_pueden_unirse: boolean };
  Insert: Database["public"]["Tables"]["partidas"]["Insert"] & { amigos_pueden_unirse?: boolean };
  Update: Database["public"]["Tables"]["partidas"]["Update"] & { amigos_pueden_unirse?: boolean };
};

type TablaSesionesEventos = Database["public"]["Tables"]["sesiones"] & {
  Row: Database["public"]["Tables"]["sesiones"]["Row"] & { evento_comunidad_id: string | null; hora_inicio: string | null; hora_fin: string | null };
  Insert: Database["public"]["Tables"]["sesiones"]["Insert"] & { evento_comunidad_id?: string | null; hora_inicio?: string | null; hora_fin?: string | null };
  Update: Database["public"]["Tables"]["sesiones"]["Update"] & { evento_comunidad_id?: string | null; hora_inicio?: string | null; hora_fin?: string | null };
};

type FuncionesNuevas = {
  actualizar_insignias_perfil: {
    Args: { p_seguidor_youtube: boolean; p_creador_jdr: boolean };
    Returns: undefined;
  };
  actualizar_evento_comunidad: {
    Args: {
      p_evento_id: string;
      p_titulo: string;
      p_descripcion: string;
      p_imagen_url: string | null;
      p_fecha: string;
      p_hora_inicio: string;
      p_hora_fin: string;
      p_ubicacion: string;
      p_modalidad: "abierto" | "cerrado";
      p_mesas_max: number | null;
    };
    Returns: undefined;
  };
  estadisticas_usuario: {
    Args: { p_user_id: string };
    Returns: EstadisticasUsuario;
  };
  finalizar_partida: {
    Args: { p_partida_id: string };
    Returns: undefined;
  };
  actualizar_bio_perfil: {
    Args: { p_bio: string };
    Returns: undefined;
  };
  listar_eventos_comunidad: {
    Args: Record<PropertyKey, never>;
    Returns: EventoComunidad[];
  };
  crear_evento_comunidad: {
    Args: {
      p_titulo: string;
      p_descripcion: string;
      p_imagen_url: string | null;
      p_fecha: string;
      p_hora_inicio: string;
      p_hora_fin: string;
      p_ubicacion: string;
      p_modalidad: "abierto" | "cerrado";
      p_mesas_max: number | null;
      p_partida_ids: string[];
    };
    Returns: string;
  };
  eliminar_evento_comunidad: {
    Args: { p_evento_id: string };
    Returns: undefined;
  };
  unirse_partida_evento: {
    Args: { p_sesion_id: string };
    Returns: undefined;
  };
  agregar_partida_evento: {
    Args: { p_evento_id: string; p_partida_id: string };
    Returns: undefined;
  };
  quitar_partida_evento: {
    Args: { p_evento_id: string; p_partida_id: string };
    Returns: undefined;
  };
  listar_sesiones_usuario: {
    Args: Record<PropertyKey, never>;
    Returns: SesionUsuarioRow[];
  };
  cancelar_solicitud_amistad: {
    Args: { p_solicitud_id: string };
    Returns: undefined;
  };
  eliminar_amistad: {
    Args: { p_user_id: string };
    Returns: undefined;
  };
  listar_amistades: {
    Args: { p_user_id: string };
    Returns: DatosAmistad;
  };
  marcar_apoyo_kofi: {
    Args: { p_user_id: string; p_apoyado: boolean };
    Returns: undefined;
  };
  responder_solicitud_amistad: {
    Args: { p_solicitud_id: string; p_aceptar: boolean };
    Returns: undefined;
  };
  solicitar_amistad: {
    Args: { p_user_id: string };
    Returns: string;
  };
};

export type FeatureDatabase = Database & {
  public: {
    Tables: {
      partidas: TablaPartidasConAccesoAmistades;
      sesiones: TablaSesionesEventos;
    };
    Functions: FuncionesNuevas;
  };
};
