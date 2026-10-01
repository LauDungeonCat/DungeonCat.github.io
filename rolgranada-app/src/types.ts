import type {
  DisponibilidadPartidaRow,
  PartidaConAccesoRow as PartidaConAccesoRowOriginal,
  ProfileRow,
  RolUsuario,
  SesionUsuarioRow,
} from "./lib/database.types";

export type FranjaEstado = "puedo" | "podria" | "no_puedo";
export type FranjaHorario = "manana" | "tarde";
export type CambioDisponibilidad = { fecha: string } & Partial<
  Record<FranjaHorario, FranjaEstado>
>;

export type PartidaConAccesoRow = PartidaConAccesoRowOriginal;

export interface DisponibilidadDia {
  fecha: string;
  manana?: FranjaEstado;
  tarde?: FranjaEstado;
  franjasMarcadas?: FranjaHorario[];
}

export interface Partida {
  id: string;
  titulo: string;
  sistema: string;
  dmId: string;
  dm: string;
  dmAvatarUrl: string | null;
  ubicacionAproximada: string;
  ubicacionExacta: string | null;
  imagenUrl: string;
  descripcion: string | null;
  participantesMax: number;
  participantesCount: number;
  viewerIsParticipant: boolean;
  viewerHasRequested: boolean;
  esPrivada: boolean;
  proximaSesion?: string;
  proximaSesionFranja?: FranjaHorario;
  estado: "abierta" | "en_curso" | "finalizada";
  sesionesAlMes: number;
  duracionEstimada: string | null;
}

export interface PartidaEditable {
  titulo: string;
  sistema: string;
  ubicacionAproximada: string;
  ubicacionExacta?: string | null;
  descripcion?: string | null;
  imagenUrl?: string | null;
  participantesMax: number;
  sesionesAlMes: number;
  duracionEstimada: string;
  esPrivada?: boolean;
}

export interface UsuarioActivo extends ProfileRow {
  nombre: string;
  partidasInscritasIds: string[];
  disponibilidad: Record<string, DisponibilidadDia>;
}

export type MapaDisponibilidad = DisponibilidadPartidaRow;
export type SesionAgendada = SesionUsuarioRow;
export type { RolUsuario };