import type { Database } from "./database.types";
import type {
  EstadisticasUsuario,
  DatosAmistad,
} from "../types";

type TablaPartidasConAccesoAmistades = Database["public"]["Tables"]["partidas"] & {
  Row: Database["public"]["Tables"]["partidas"]["Row"] & { amigos_pueden_unirse: boolean; es_evento: boolean };
  Insert: Database["public"]["Tables"]["partidas"]["Insert"] & { amigos_pueden_unirse?: boolean; es_evento?: boolean };
  Update: Database["public"]["Tables"]["partidas"]["Update"] & { amigos_pueden_unirse?: boolean; es_evento?: boolean };
};

type FuncionesNuevas = {
  actualizar_insignias_perfil: {
    Args: { p_seguidor_youtube: boolean; p_creador_jdr: boolean };
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
  marcar_partida_evento: {
    Args: { p_partida_id: string; p_es_evento: boolean };
    Returns: undefined;
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
    };
    Functions: FuncionesNuevas;
  };
};
