import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { useRolData } from "../useRolData";
import type { JugadorPartidaRow } from "../lib/database.types";
import type { Partida } from "../types";
import "./GestionPartida.css";

const AgendamientoInteligente = lazy(() => import("./AgendamientoInteligente"));

export default function GestionPartida({ partida }: { partida: Partida }) {
	const { profile, requestLogin } = useAuth();
	const { error, actualizarCapacidad, cargarJugadoresPartida, invitarJugador, echarJugador } = useRolData();
	const [jugadores, setJugadores] = useState<JugadorPartidaRow[]>([]);
	const [jugadoresCargadosId, setJugadoresCargadosId] = useState<string | null>(null);
	const [capacidad, setCapacidad] = useState(String(partida.participantesMax));
	const [username, setUsername] = useState("");
	const [errorLocal, setErrorLocal] = useState<string | null>(null);
	const [mensajeEnlace, setMensajeEnlace] = useState("");
	const [guardando, setGuardando] = useState(false);
	const [agendamientoAbierto, setAgendamientoAbierto] = useState(false);
	const puedeGestionar = profile?.id === partida.dmId || profile?.role === "admin";

	useEffect(() => {
		let activa = true;
		if (!puedeGestionar) return () => { activa = false; };
		void cargarJugadoresPartida(partida.id)
			.then((lista) => { if (activa) { setJugadores(lista); setJugadoresCargadosId(partida.id); } })
			.catch((loadError: unknown) => { if (activa) { setErrorLocal(loadError instanceof Error ? loadError.message : "No se pudo cargar el roster."); setJugadoresCargadosId(partida.id); } });
		return () => { activa = false; };
	}, [cargarJugadoresPartida, partida.id, puedeGestionar]);

	async function actualizarRoster() {
		const lista = await cargarJugadoresPartida(partida.id);
		setJugadores(lista);
		setJugadoresCargadosId(partida.id);
	}

	async function guardarCapacidad() {
		if (!profile) { requestLogin(); return; }
		const nuevaCapacidad = Number(capacidad);
		if (!Number.isInteger(nuevaCapacidad) || nuevaCapacidad < Math.max(2, jugadores.length)) {
			setErrorLocal(`La capacidad mínima es ${Math.max(2, jugadores.length)}.`);
			return;
		}
		setGuardando(true);
		setErrorLocal(null);
		try { await actualizarCapacidad(partida.id, nuevaCapacidad); }
		catch (saveError) { setErrorLocal(saveError instanceof Error ? saveError.message : "No se pudo guardar la capacidad."); }
		finally { setGuardando(false); }
	}

	async function enviarInvitacion(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!profile) { requestLogin(); return; }
		setGuardando(true);
		setErrorLocal(null);
		try {
			await invitarJugador(partida.id, username.trim());
			setUsername("");
			await actualizarRoster();
		} catch (inviteError) { setErrorLocal(inviteError instanceof Error ? inviteError.message : "No se pudo invitar al jugador."); }
		finally { setGuardando(false); }
	}

	async function quitarJugador(jugador: JugadorPartidaRow) {
		if (!window.confirm(`¿Quitar a ${jugador.username} de la partida?`)) return;
		try {
			await echarJugador(partida.id, jugador.user_id);
			await actualizarRoster();
		} catch (kickError) { setErrorLocal(kickError instanceof Error ? kickError.message : "No se pudo quitar al jugador."); }
	}

	async function copiarEnlace() {
		const enlace = new URL(import.meta.env.BASE_URL, window.location.origin);
		enlace.searchParams.set("partida", partida.id);
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
				<button type="button" className="fechar-sesiones-trigger" onClick={() => setAgendamientoAbierto(true)}>Fechar sesiones</button>
			</header>
			{(errorLocal || error) && <p className="datos-error" role="alert">{errorLocal ?? error}</p>}
			<div className="gestion-partida-campos">
				<label>Capacidad<input type="number" min={Math.max(2, jugadores.length)} max="20" value={capacidad} onChange={(event) => setCapacidad(event.target.value)} /></label>
				<button type="button" disabled={guardando || jugadoresCargadosId !== partida.id} onClick={() => { void guardarCapacidad(); }}>Guardar capacidad</button>
				<button type="button" className="copiar-invitacion" onClick={() => { void copiarEnlace(); }}>Copiar enlace de invitación</button>
				{mensajeEnlace && <span className="gestion-enlace-mensaje" role="status">{mensajeEnlace}</span>}
			</div>
			<form className="gestion-partida-invitar" onSubmit={enviarInvitacion}>
				<label htmlFor={`username-${partida.id}`}>Invitar por username</label>
				<div><input id={`username-${partida.id}`} required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" /><button type="submit" disabled={guardando}>Invitar</button></div>
			</form>
			<div className="gestion-partida-roster">
				<h4>Jugadores ({jugadores.length}/{partida.participantesMax})</h4>
				{jugadoresCargadosId !== partida.id ? <p role="status">Cargando jugadores…</p> : jugadores.length ? <ul>
					{jugadores.map((jugador) => <li key={jugador.user_id}>
						<span>{jugador.username}</span>
						<button type="button" onClick={() => { void quitarJugador(jugador); }} aria-label={`Quitar a ${jugador.username}`}>Quitar</button>
					</li>)}
				</ul> : <p>Aún no hay jugadores inscritos.</p>}
			</div>
			{agendamientoAbierto && <Suspense fallback={<p role="status">Cargando agendamiento…</p>}><AgendamientoInteligente partida={partida} onClose={() => setAgendamientoAbierto(false)} /></Suspense>}
		</section>
	);
}
