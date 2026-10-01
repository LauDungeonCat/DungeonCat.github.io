import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { useRolData } from "../useRolData";
import type { JugadorPartidaRow, SolicitudPartidaRow } from "../lib/database.types";
import type { Partida } from "../types";
import "./GestionPartida.css";

const AgendamientoInteligente = lazy(() => import("./AgendamientoInteligente"));

function mensajeError(value: unknown, fallback: string): string {
	if (value instanceof Error) return value.message;
	if (
		typeof value === "object" &&
		value !== null &&
		"message" in value &&
		typeof (value as { message: unknown }).message === "string"
	) {
		return (value as { message: string }).message;
	}
	return fallback;
}

export default function GestionPartida({ partida }: { partida: Partida }) {
	const { profile, requestLogin } = useAuth();
	const { error, actualizarCapacidad, cargarJugadoresPartida, cargarSolicitudesPartida, resolverSolicitudPartida, obtenerCodigoInvitacion, invitarJugador, echarJugador } = useRolData();

	const [jugadores, setJugadores] = useState<JugadorPartidaRow[]>([]);
	const [solicitudes, setSolicitudes] = useState<SolicitudPartidaRow[]>([]);
	const [jugadoresCargadosId, setJugadoresCargadosId] = useState<string | null>(null);
	const [errorRoster, setErrorRoster] = useState<string | null>(null);
	const [capacidad, setCapacidad] = useState<string | null>(null);
	const [username, setUsername] = useState("");
	const [errorLocal, setErrorLocal] = useState<string | null>(null);
	const [mensajeEnlace, setMensajeEnlace] = useState("");
	const [guardando, setGuardando] = useState(false);
	const [capacidadAbierta, setCapacidadAbierta] = useState(false);
	const [agendamientoAbierto, setAgendamientoAbierto] = useState(false);

	const puedeGestionar = profile?.id === partida.dmId || profile?.role === "admin";

	// Cargar roster al cambiar de partida o permisos
	useEffect(() => {
		let activa = true;

		if (!puedeGestionar) return () => { activa = false; };

		void cargarJugadoresPartida(partida.id)
			.then((lista) => {
				if (activa) {
					setJugadores(lista);
					setErrorRoster(null);
					setJugadoresCargadosId(partida.id);
				}
			})
			.catch((loadError: unknown) => {
				if (activa) {
					setErrorRoster(mensajeError(loadError, "No se pudo cargar el roster."));
				}
			});
		void cargarSolicitudesPartida(partida.id)
			.then((lista) => {
				if (activa) setSolicitudes(lista);
			})
			.catch((loadError: unknown) => {
				if (activa) setErrorRoster(mensajeError(loadError, "No se pudieron cargar las solicitudes."));
			});

		return () => {
			activa = false;
		};
	}, [cargarJugadoresPartida, cargarSolicitudesPartida, partida.id, puedeGestionar]);

	// Temporizador para limpiar el mensaje de "Enlace copiado"
	useEffect(() => {
		if (!mensajeEnlace) return;
		const timer = setTimeout(() => setMensajeEnlace(""), 3000);
		return () => clearTimeout(timer);
	}, [mensajeEnlace]);

	async function actualizarRoster() {
		setErrorRoster(null);
		try {
			const lista = await cargarJugadoresPartida(partida.id);
			setJugadores(lista);
			setJugadoresCargadosId(partida.id);
		} catch (loadError) {
			setErrorRoster(mensajeError(loadError, "No se pudo cargar el roster."));
			throw loadError;
		}
	}

	async function resolverSolicitud(userId: string, aceptar: boolean) {
		setErrorLocal(null);
		try {
			await resolverSolicitudPartida(partida.id, userId, aceptar);
			setSolicitudes(await cargarSolicitudesPartida(partida.id));
			if (aceptar) await actualizarRoster();
		} catch (requestError) {
			setErrorLocal(mensajeError(requestError, "No se pudo resolver la solicitud."));
		}
	}

	async function guardarCapacidad() {
		if (!profile) {
			requestLogin();
			return;
		}
		const nuevaCapacidad = Number(capacidad ?? partida.participantesMax);
		const minPermitido = Math.max(2, jugadores.length);

		if (!Number.isInteger(nuevaCapacidad) || nuevaCapacidad < minPermitido) {
			setErrorLocal(`La capacidad mínima es ${minPermitido}.`);
			return;
		}

		setGuardando(true);
		setErrorLocal(null);
		try {
			await actualizarCapacidad(partida.id, nuevaCapacidad);
			setCapacidad(String(nuevaCapacidad));
			setCapacidadAbierta(false);
			await actualizarRoster();
		} catch (saveError) {
			setErrorLocal(mensajeError(saveError, "No se pudo guardar la capacidad."));
		} finally {
			setGuardando(false);
		}
	}

	async function enviarInvitacion(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!profile) {
			requestLogin();
			return;
		}
		const usuarioLimpio = username.trim();
		if (!usuarioLimpio) return;

		setGuardando(true);
		setErrorLocal(null);
		try {
			await invitarJugador(partida.id, usuarioLimpio);
			setUsername("");
			await actualizarRoster();
		} catch (inviteError) {
			setErrorLocal(mensajeError(inviteError, "No se pudo invitar al jugador."));
		} finally {
			setGuardando(false);
		}
	}

	async function quitarJugador(jugador: JugadorPartidaRow) {
		if (!window.confirm(`¿Quitar a ${jugador.username} de la partida?`)) return;
		setErrorLocal(null);
		try {
			await echarJugador(partida.id, jugador.user_id);
			await actualizarRoster();
		} catch (kickError) {
			setErrorLocal(mensajeError(kickError, "No se pudo quitar al jugador."));
		}
	}

	async function copiarEnlace() {
		const enlace = new URL(import.meta.env.BASE_URL, window.location.origin);
		enlace.searchParams.set("partida", partida.id);
		if (partida.esPrivada) {
			try {
				const codigo = await obtenerCodigoInvitacion(partida.id);
				enlace.searchParams.set("invitacion", codigo);
			} catch {
				setMensajeEnlace("No se pudo generar el enlace de invitación.");
				return;
			}
		}
		try {
			await navigator.clipboard.writeText(enlace.toString());
			setMensajeEnlace("Enlace copiado");
		} catch {
			setMensajeEnlace(enlace.toString());
		}
	}

	return (
		<section className="gestion-partida" aria-labelledby={`gestion-title-${partida.id}`}>
			<header className="gestion-partida-header">
				<h3 id={`gestion-title-${partida.id}`}>Gestión del DM</h3>
				<button
					type="button"
					className="fechar-sesiones-trigger"
					onClick={() => setAgendamientoAbierto(true)}
				>
					Fechar sesiones
				</button>
			</header>

			{(errorLocal || error) && (
				<p className="datos-error" role="alert">
					{errorLocal ?? error}
				</p>
			)}

			<div className="gestion-partida-campos">
				<button type="button" className="copiar-invitacion" onClick={() => void copiarEnlace()}>
					Copiar enlace de invitación
				</button>
				{mensajeEnlace && (
					<span className="gestion-enlace-mensaje" role="status">
						{mensajeEnlace}
					</span>
				)}
			</div>

			{partida.esPrivada && (
				<div className="gestion-solicitudes">
					<h4>Solicitudes pendientes ({solicitudes.length})</h4>
					{solicitudes.length ? (
						<ul>
							{solicitudes.map((solicitud) => (
								<li key={solicitud.user_id}>
									<span>{solicitud.username}</span>
									<div>
										<button type="button" onClick={() => void resolverSolicitud(solicitud.user_id, true)}>Aceptar</button>
										<button type="button" onClick={() => void resolverSolicitud(solicitud.user_id, false)}>Rechazar</button>
									</div>
								</li>
							))}
						</ul>
					) : <p>No hay solicitudes pendientes.</p>}
				</div>
			)}

			<form className="gestion-partida-invitar" onSubmit={enviarInvitacion}>
				<label htmlFor={`username-${partida.id}`}>Invitar por username</label>
				<div>
					<input
						id={`username-${partida.id}`}
						required
						value={username}
						onChange={(event) => setUsername(event.target.value)}
						placeholder="username"
						disabled={guardando}
					/>
					<button type="submit" disabled={guardando || !username.trim()}>
						{guardando ? "Invitando…" : "Invitar"}
					</button>
				</div>
			</form>

			<div className="gestion-partida-roster">
				<header className="gestion-partida-roster-header">
					<h4>
						Jugadores ({jugadores.length}/{partida.participantesMax})
					</h4>
					<button
						type="button"
						onClick={() => {
							setCapacidad(String(partida.participantesMax));
							setCapacidadAbierta((abierta) => !abierta);
						}}
					>
						{capacidadAbierta ? "Cancelar" : "Cambiar capacidad"}
					</button>
				</header>

				{errorRoster && (
					<p className="gestion-roster-error" role="alert">
						{errorRoster}
					</p>
				)}

				{capacidadAbierta && (
					<div className="gestion-partida-capacidad">
						<label>
							Máximo de jugadores
							<input
								type="number"
								min={Math.max(2, jugadores.length)}
								max="20"
								value={capacidad ?? String(partida.participantesMax)}
								onChange={(event) => setCapacidad(event.target.value)}
								disabled={guardando}
							/>
						</label>
						<button
							type="button"
							disabled={guardando || jugadoresCargadosId !== partida.id}
							onClick={() => void guardarCapacidad()}
						>
							{guardando ? "Guardando…" : "Guardar"}
						</button>
					</div>
				)}

				{jugadoresCargadosId !== partida.id ? (
					<p role="status">
						{errorRoster ? (
							<button
								type="button"
								onClick={() => {
									setErrorRoster(null);
									void actualizarRoster().catch(() => undefined);
								}}
							>
								Reintentar carga del roster
							</button>
						) : (
							"Cargando jugadores…"
						)}
					</p>
				) : jugadores.length ? (
					<ul>
						{jugadores.map((jugador) => {
							const estadisticasDisponibles = Number.isFinite(jugador.franjas_indicadas)
								&& Number.isFinite(jugador.franjas_sin_indicar);
							const franjasIndicadas = jugador.franjas_indicadas ?? 0;
							const franjasSinIndicar = jugador.franjas_sin_indicar ?? 0;
							return <li key={jugador.user_id}>
								<div className="gestion-jugador-identidad">
									<span>{jugador.username}</span>
									<span
										className={`jugador-disponibilidad ${!estadisticasDisponibles || franjasIndicadas === 0 ? "sin-disponibilidad" : "con-disponibilidad"}`}
										title="El resumen cuenta las fechas guardadas; los días sin fila no se pueden distinguir de un mes aún no editado."
									>
										{!estadisticasDisponibles
											? "Resumen no disponible; actualiza el SQL de Supabase"
											: franjasIndicadas === 0
											? "No ha rellenado nada"
											: franjasSinIndicar > 0
												? `Parcial: ${franjasIndicadas} franjas indicadas, ${franjasSinIndicar} sin indicar`
												: `${franjasIndicadas} franjas indicadas en los días guardados`}
									</span>
								</div>
								<button
									type="button"
									onClick={() => void quitarJugador(jugador)}
									aria-label={`Quitar a ${jugador.username}`}
									disabled={guardando}
								>
									Quitar
								</button>
							</li>;
						})}
					</ul>
				) : (
					<p>Aún no hay jugadores inscritos.</p>
				)}
			</div>

			{agendamientoAbierto && (
				<Suspense fallback={<p role="status">Cargando agendamiento…</p>}>
					<AgendamientoInteligente partida={partida} onClose={() => setAgendamientoAbierto(false)} />
				</Suspense>
			)}
		</section>
	);
}