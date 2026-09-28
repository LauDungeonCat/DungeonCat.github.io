import { useCallback, useSyncExternalStore } from "react";
import { CLAVE_PARTIDAS, CLAVE_USUARIO, initLocalStorage } from "./seedLocalStorage";
import type { DisponibilidadDia, FranjaEstado, FranjaHorario, RolData } from "./types";

const EVENTO_CAMBIO = "rolgranada:data-changed";
let snapshot: RolData | undefined;

function obtenerSnapshot(): RolData {
	if (!snapshot) snapshot = initLocalStorage();
	return snapshot;
}

function notificarCambio() {
	window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

function suscribirse(callback: () => void) {
	function alCambiarAlmacen() {
		snapshot = undefined;
		callback();
	}

	window.addEventListener(EVENTO_CAMBIO, callback);
	window.addEventListener("storage", alCambiarAlmacen);
	return () => {
		window.removeEventListener(EVENTO_CAMBIO, callback);
		window.removeEventListener("storage", alCambiarAlmacen);
	};
}

function leerDatosActuales(): RolData {
	const datos = initLocalStorage();
	snapshot = datos;
	return datos;
}

function guardarDatos(datos: RolData) {
	snapshot = datos;
	localStorage.setItem(CLAVE_USUARIO, JSON.stringify(datos.usuario));
	localStorage.setItem(CLAVE_PARTIDAS, JSON.stringify(datos.partidas));
	notificarCambio();
}

export function useRolData() {
	const datos = useSyncExternalStore(suscribirse, obtenerSnapshot, obtenerSnapshot);

	const actualizarDisponibilidad = useCallback((fecha: string, cambios: Partial<Record<FranjaHorario, FranjaEstado>>) => {
		const actual = leerDatosActuales();
		const diaAnterior = actual.usuario.disponibilidad[fecha];
		const franjasMarcadas = new Set(diaAnterior?.franjasMarcadas ?? []);
		for (const franja of Object.keys(cambios) as FranjaHorario[]) franjasMarcadas.add(franja);
		const diaActualizado: DisponibilidadDia = {
			fecha,
			manana: diaAnterior?.manana ?? "podria",
			tarde: diaAnterior?.tarde ?? "podria",
			franjasMarcadas: [...franjasMarcadas],
			...cambios,
		};
		guardarDatos({
			...actual,
			usuario: {
				...actual.usuario,
				disponibilidad: { ...actual.usuario.disponibilidad, [fecha]: diaActualizado },
			},
		});
	}, []);

	const unirseAPartida = useCallback((partidaId: string) => {
		const actual = leerDatosActuales();
		const partida = actual.partidas.find((item) => item.id === partidaId);
		if (!partida || partida.estado !== "abierta") return;
		if (partida.participantesActuales.length >= partida.participantesMax) return;
		if (actual.usuario.partidasInscritasIds.includes(partidaId)) return;

		guardarDatos({
			usuario: {
				...actual.usuario,
				partidasInscritasIds: [...actual.usuario.partidasInscritasIds, partidaId],
			},
			partidas: actual.partidas.map((item) => item.id === partidaId
				? { ...item, participantesActuales: [...item.participantesActuales, actual.usuario.id] }
				: item),
		});
	}, []);

	const desapuntarseDePartida = useCallback((partidaId: string) => {
		const actual = leerDatosActuales();
		guardarDatos({
			usuario: {
				...actual.usuario,
				partidasInscritasIds: actual.usuario.partidasInscritasIds.filter((id) => id !== partidaId),
			},
			partidas: actual.partidas.map((partida) => partida.id === partidaId
				? { ...partida, participantesActuales: partida.participantesActuales.filter((id) => id !== actual.usuario.id) }
				: partida),
		});
	}, []);

	return {
		usuario: datos.usuario,
		partidas: datos.partidas,
		actualizarDisponibilidad,
		unirseAPartida,
		desapuntarseDePartida,
	};
}