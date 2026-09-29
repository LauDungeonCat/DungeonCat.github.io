import type { DisponibilidadPartidaRow, ProfileRow, RolUsuario, SesionUsuarioRow } from "./lib/database.types";

export type FranjaEstado = "puedo" | "podria" | "no_puedo";
export type FranjaHorario = "manana" | "tarde";
export type CambioDisponibilidad = { fecha: string } & Partial<Record<FranjaHorario, FranjaEstado>>;

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
	notasDm: string | null;
	imagenUrl: string;
	descripcion: string | null;
	participantesMax: number;
	participantesCount: number;
	viewerIsParticipant: boolean;
	proximaSesion?: string;
	proximaSesionFranja?: FranjaHorario;
	estado: "abierta" | "en_curso" | "finalizada";
}

export interface UsuarioActivo extends ProfileRow {
	nombre: string;
	partidasInscritasIds: string[];
	disponibilidad: Record<string, DisponibilidadDia>;
}

export type PartidaEditable = Pick<Partida, "titulo" | "sistema" | "descripcion" | "imagenUrl" | "participantesMax" | "proximaSesion" | "ubicacionAproximada" | "ubicacionExacta" | "notasDm">;
export type MapaDisponibilidad = DisponibilidadPartidaRow;
export type SesionAgendada = SesionUsuarioRow;
export type { RolUsuario };