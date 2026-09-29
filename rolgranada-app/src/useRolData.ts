import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/useAuth";
import type { DisponibilidadPartidaRow, JugadorPartidaRow, PartidaConAccesoRow, SesionUsuarioRow } from "./lib/database.types";
import { supabase } from "./lib/supabase";
import type { CambioDisponibilidad, DisponibilidadDia, FranjaEstado, FranjaHorario, Partida, PartidaEditable, UsuarioActivo } from "./types";

function mensajeError(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
	return "No se pudo completar la operación.";
}

function mapearPartida(row: PartidaConAccesoRow): Partida {
	return {
		id: row.id,
		titulo: row.titulo,
		sistema: row.sistema,
		dmId: row.dm_id,
		dm: row.dm_username,
		dmAvatarUrl: row.dm_avatar_url,
		ubicacionAproximada: row.ubicacion_aproximada,
		ubicacionExacta: row.ubicacion_exacta,
		notasDm: row.notas_dm,
		imagenUrl: row.imagen_url ?? "",
		descripcion: row.descripcion,
		participantesMax: row.participantes_max,
		participantesCount: row.participantes_count,
		viewerIsParticipant: row.viewer_is_participant,
		proximaSesion: row.proxima_sesion ?? undefined,
		proximaSesionFranja: row.proxima_sesion_franja ?? undefined,
		estado: row.estado,
		sesionesAlMes: row.sesiones_al_mes,
	};
}

function mapearDisponibilidad(rows: { fecha: string; manana: string; tarde: string }[]) {
	return Object.fromEntries(rows.map((row) => {
		const manana = row.manana === "no_indicado" ? undefined : row.manana as FranjaEstado;
		const tarde = row.tarde === "no_indicado" ? undefined : row.tarde as FranjaEstado;
		return [row.fecha, {
			fecha: row.fecha,
			manana,
			tarde,
			franjasMarcadas: [
				...(manana ? ["manana" as const] : []),
				...(tarde ? ["tarde" as const] : []),
			],
		} satisfies DisponibilidadDia];
	}));
}

export function useRolData() {
	const { profile } = useAuth();
	const [partidas, setPartidas] = useState<Partida[]>([]);
	const [sesiones, setSesiones] = useState<SesionUsuarioRow[]>([]);
	const [disponibilidad, setDisponibilidad] = useState<Record<string, DisponibilidadDia>>({});
	const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const cargarDatos = useCallback(async (userId: string) => {
		const partidasResult = await supabase.rpc("listar_partidas");
		if (partidasResult.error) throw partidasResult.error;
		let sesionesUsuario: SesionUsuarioRow[] = [];
		let filasDisponibilidad: { fecha: string; manana: string; tarde: string }[] = [];
		if (userId) {
			const [disponibilidadResult, sesionesResult] = await Promise.all([
				supabase.from("disponibilidades").select("fecha, manana, tarde").eq("user_id", userId),
				supabase.rpc("listar_sesiones_usuario"),
			]);
			if (disponibilidadResult.error) throw disponibilidadResult.error;
			if (sesionesResult.error) throw sesionesResult.error;
			filasDisponibilidad = disponibilidadResult.data ?? [];
			sesionesUsuario = sesionesResult.data ?? [];
		}
		const ahora = new Date();
		const partidasActualizadas = (partidasResult.data ?? []).map((row) => {
			const partida = mapearPartida(row);
			const siguiente = sesionesUsuario
				.filter((sesion) => sesion.partida_id === partida.id)
				.map((sesion) => ({
					sesion,
					fechaHora: new Date(`${sesion.fecha}T${sesion.franja === "manana" ? "09:00:00" : "15:00:00"}`),
				}))
				.filter(({ fechaHora }) => fechaHora > ahora)
				.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())[0];
			return siguiente ? {
				...partida,
				proximaSesion: `${siguiente.sesion.fecha}T${siguiente.sesion.franja === "manana" ? "09:00:00" : "15:00:00"}`,
				proximaSesionFranja: siguiente.sesion.franja,
			} : partida;
		});
		return {
			partidas: partidasActualizadas,
			disponibilidad: mapearDisponibilidad(filasDisponibilidad),
			sesiones: sesionesUsuario,
		};
	}, []);

	useEffect(() => {
		let activo = true;
		const userId = profile?.id ?? "anonymous";
		void cargarDatos(profile?.id ?? "")
			.then((datos) => {
				if (!activo) return;
				setPartidas(datos.partidas);
				setDisponibilidad(datos.disponibilidad);
				setSesiones(datos.sesiones);
				setError(null);
				setLoadedUserId(userId);
			})
			.catch((loadError: unknown) => {
				if (!activo) return;
				setError(mensajeError(loadError));
				setLoadedUserId(userId);
			});
		return () => { activo = false; };
	}, [cargarDatos, profile?.id]);

	const ejecutar = useCallback(async (operacion: () => Promise<void>) => {
		setError(null);
		try {
			await operacion();
			const userId = profile?.id ?? "";
			const datos = await cargarDatos(userId);
			setPartidas(datos.partidas);
			setDisponibilidad(datos.disponibilidad);
				setSesiones(datos.sesiones);
			setLoadedUserId(userId || "anonymous");
		} catch (operationError) {
			setError(mensajeError(operationError));
			throw operationError;
		}
	}, [cargarDatos, profile]);

	const actualizarDisponibilidades = useCallback(async (cambios: CambioDisponibilidad[]) => {
		if (!profile || cambios.length === 0) return;
		const filas = cambios.map(({ fecha, manana, tarde }) => ({
			user_id: profile.id,
			fecha,
			manana: manana ?? disponibilidad[fecha]?.manana ?? "no_indicado" as const,
			tarde: tarde ?? disponibilidad[fecha]?.tarde ?? "no_indicado" as const,
		}));
		await ejecutar(async () => {
			const { error: saveError } = await supabase.from("disponibilidades").upsert(filas, { onConflict: "user_id,fecha" });
			if (saveError) throw saveError;
		});
	}, [disponibilidad, ejecutar, profile]);

	const actualizarDisponibilidad = useCallback((fecha: string, cambios: Partial<Record<"manana" | "tarde", FranjaEstado>>) =>
		actualizarDisponibilidades([{ fecha, ...cambios }]), [actualizarDisponibilidades]);

	const limpiarDisponibilidad = useCallback(async () => {
		if (!profile) return;
		await ejecutar(async () => {
			const { error: deleteError } = await supabase.from("disponibilidades").delete().eq("user_id", profile.id);
			if (deleteError) throw deleteError;
		});
	}, [ejecutar, profile]);

const crearPartida = useCallback(
    async (datos: PartidaEditable) => {
        if (!profile) return;
        await ejecutar(async () => {
            const { error: insertError } = await supabase.from("partidas").insert({
                titulo: datos.titulo,
                sistema: datos.sistema,
                descripcion: datos.descripcion ?? "",
                imagen_url: datos.imagenUrl ?? null,
                dm_id: profile.id,
                participantes_max: datos.participantesMax,
                sesiones_al_mes: datos.sesionesAlMes,
                proxima_sesion: datos.proximaSesion ?? null,
                ubicacion_aproximada: datos.ubicacionAproximada,
                ubicacion_exacta: datos.ubicacionExacta ?? null,
                notas_dm: datos.notasDm ?? null,
            });
            if (insertError) throw insertError;
        });
    },
    [ejecutar, profile]
);

const actualizarPartida = useCallback(
    async (id: string, datos: PartidaEditable) => {
        await ejecutar(async () => {
            const { error: updateError } = await supabase.from("partidas").update({
                titulo: datos.titulo,
                sistema: datos.sistema,
                descripcion: datos.descripcion ?? "",
                imagen_url: datos.imagenUrl ?? null,
                participantes_max: datos.participantesMax,
                sesiones_al_mes: datos.sesionesAlMes,
                proxima_sesion: datos.proximaSesion ?? null,
                ubicacion_aproximada: datos.ubicacionAproximada,
                ubicacion_exacta: datos.ubicacionExacta ?? null,
                notas_dm: datos.notasDm ?? null,
            }).eq("id", id);
            if (updateError) throw updateError;
        });
    },
    [ejecutar]
);

	const eliminarPartida = useCallback(async (id: string) => {
		await ejecutar(async () => {
			const { error: deleteError } = await supabase.from("partidas").delete().eq("id", id);
			if (deleteError) throw deleteError;
		});
	}, [ejecutar]);

	const unirseAPartida = useCallback(async (partidaId: string) => {
		await ejecutar(async () => {
			const { error: joinError } = await supabase.rpc("unirse_partida", { p_partida_id: partidaId });
			if (joinError) throw joinError;
		});
	}, [ejecutar]);

	const desapuntarseDePartida = useCallback(async (partidaId: string) => {
		if (!profile) return;
		await ejecutar(async () => {
			const { error: leaveError } = await supabase.from("partida_participantes").delete()
				.eq("partida_id", partidaId)
				.eq("user_id", profile.id);
			if (leaveError) throw leaveError;
		});
	}, [ejecutar, profile]);

	const actualizarCapacidad = useCallback(async (partidaId: string, capacidad: number) => {
		await ejecutar(async () => {
			const { error: updateError } = await supabase.from("partidas").update({ participantes_max: capacidad }).eq("id", partidaId);
			if (updateError) throw updateError;
		});
		setPartidas((anteriores) => anteriores.map((partida) => partida.id === partidaId ? { ...partida, participantesMax: capacidad } : partida));
	}, [ejecutar]);

	const cargarJugadoresPartida = useCallback(async (partidaId: string) => {
		const { data, error: playersError } = await supabase.rpc("listar_jugadores_partida", { p_partida_id: partidaId });
		if (playersError) throw playersError;
		return data as JugadorPartidaRow[];
	}, []);

	const invitarJugador = useCallback(async (partidaId: string, username: string) => {
		await ejecutar(async () => {
			const { error: inviteError } = await supabase.rpc("invitar_jugador_partida", { p_partida_id: partidaId, p_username: username });
			if (inviteError) throw inviteError;
		});
	}, [ejecutar]);

	const echarJugador = useCallback(async (partidaId: string, userId: string) => {
		await ejecutar(async () => {
			const { error: kickError } = await supabase.rpc("echar_jugador_partida", { p_partida_id: partidaId, p_user_id: userId });
			if (kickError) throw kickError;
		});
	}, [ejecutar]);

	const cargarMapaDisponibilidad = useCallback(async (partidaId: string, inicio: string, fin: string) => {
		const { data, error: heatmapError } = await supabase.rpc("listar_disponibilidad_partida", {
			p_partida_id: partidaId,
			p_inicio: inicio,
			p_fin: fin,
		});
		if (heatmapError) throw heatmapError;
		return data as DisponibilidadPartidaRow[];
	}, []);

	const subirImagenSesion = useCallback(async (partidaId: string, archivo: File) => {
		if (!profile) throw new Error("Inicia sesión para subir imágenes.");
		const extension = archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
		const ruta = `${partidaId}/${profile.id}/${crypto.randomUUID()}.${extension}`;
		const { error: uploadError } = await supabase.storage.from("sesiones").upload(ruta, archivo, {
			contentType: archivo.type,
			cacheControl: "3600",
		});
		if (uploadError) throw uploadError;
		return supabase.storage.from("sesiones").getPublicUrl(ruta).data.publicUrl;
	}, [profile]);

	const guardarSesiones = useCallback(async (
		partidaId: string,
		seleccionadas: { fecha: string; franja: FranjaHorario }[],
		notas = "",
		imagenUrl: string | null = null,
	) => {
		if (seleccionadas.length === 0) return;
		await ejecutar(async () => {
			const filas = seleccionadas.map(({ fecha, franja }) => ({ partida_id: partidaId, fecha, franja, notas, imagen_url: imagenUrl }));
			const { error: sessionError } = await supabase.from("sesiones").upsert(
				filas,
				{ onConflict: "partida_id,fecha,franja" },
			);
			if (sessionError) throw sessionError;
		});
	}, [ejecutar]);

	const borrarSesion = useCallback(async (partidaId: string, fecha: string, franja: FranjaHorario) => {
		await ejecutar(async () => {
			const { error: deleteError } = await supabase.from("sesiones").delete()
				.eq("partida_id", partidaId).eq("fecha", fecha).eq("franja", franja);
			if (deleteError) throw deleteError;
		});
	}, [ejecutar]);

	const usuario = useMemo<UsuarioActivo | null>(() => profile ? {
		...profile,
		nombre: profile.username,
		partidasInscritasIds: partidas.filter((partida) => partida.viewerIsParticipant).map((partida) => partida.id),
		disponibilidad,
	} : null, [disponibilidad, partidas, profile]);
	return {
		usuario,
		partidas,
		sesiones,
		loading: loadedUserId !== (profile?.id ?? "anonymous"),
		error,
		actualizarDisponibilidad,
		actualizarDisponibilidades,
		limpiarDisponibilidad,
		crearPartida,
		actualizarPartida,
		actualizarCapacidad,
		eliminarPartida,
		cargarJugadoresPartida,
		invitarJugador,
		echarJugador,
		cargarMapaDisponibilidad,
		subirImagenSesion,
		guardarSesiones,
		borrarSesion,
		unirseAPartida,
		desapuntarseDePartida,
	};
}