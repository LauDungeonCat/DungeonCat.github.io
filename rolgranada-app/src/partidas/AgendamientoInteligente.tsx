import { useEffect, useState, type CSSProperties } from "react";
import { useRolData } from "../useRolData";
import type { FranjaHorario, MapaDisponibilidad, Partida } from "../types";
import { obtenerRangoMeses } from "./rangoMeses";
import "./AgendamientoInteligente.css";

type FranjaSeleccionada = { fecha: string; franja: FranjaHorario };

const nombresDias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const nombresFranjas: Record<FranjaHorario, string> = { manana: "Mañana", tarde: "Tarde" };

function fechaIso(fecha: Date) {
	return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function clasificarFranja(franja: MapaDisponibilidad | undefined) {
	if (franja?.no_pueden) return "no-disponible";
	if (!franja || franja.participantes === 0 || franja.no_indicado > 0) return "incompleta";
	if (franja.pueden === franja.participantes) return "disponible";
	return "posible";
}

function BotonFranja({
	fecha,
	franja,
	respuestas,
	seleccionada,
	agendada,
	fechaPasada,
	onSelect,
}: {
	fecha: string;
	franja: FranjaHorario;
	respuestas?: MapaDisponibilidad;
	seleccionada: boolean;
	agendada: boolean;
	fechaPasada: boolean;
	onSelect: () => void;
}) {
	const estado = clasificarFranja(respuestas);
	const seleccionable = estado === "disponible" || estado === "posible";
	const sinRespuesta = respuestas?.no_indicado ?? 0;
	const porcentajePodria = respuestas?.participantes ? Math.round((respuestas.podrian / respuestas.participantes) * 100) : 0;
	const style: CSSProperties | undefined = estado === "posible"
		? { backgroundColor: `color-mix(in srgb, #f2c14e ${porcentajePodria}%, #91d3a7)` }
		: undefined;

	return (
		<button
			className={`heatmap-slot heatmap-${estado}${seleccionada || agendada ? " heatmap-seleccionada" : ""}`}
			type="button"
			disabled={fechaPasada || (!seleccionable && !agendada)}
			onClick={onSelect}
			style={style}
			aria-pressed={seleccionada || agendada}
			aria-label={`${fecha}, ${nombresFranjas[franja]}: ${estado === "no-disponible" ? "alguien no puede" : estado === "incompleta" ? `${sinRespuesta} sin responder` : estado === "disponible" ? "todos pueden" : "disponibilidad posible"}${agendada ? ", sesión confirmada" : ""}`}
			title={sinRespuesta > 0 ? `${sinRespuesta} jugadores sin responder` : undefined}
		>
			<span>{nombresFranjas[franja]}</span>
			{sinRespuesta > 0 && <small>{sinRespuesta} sin responder</small>}
			{agendada && <small>Confirmada</small>}
		</button>
	);
}

export default function AgendamientoInteligente({ partida, onClose }: { partida: Partida; onClose: () => void }) {
	const { sesiones, cargarMapaDisponibilidad, guardarSesiones, borrarSesion } = useRolData();
	const [mesVisible, setMesVisible] = useState(() => obtenerRangoMeses().mesInicial);
	const [resultadoMapa, setResultadoMapa] = useState<{ clave: string; filas: MapaDisponibilidad[] }>({ clave: "", filas: [] });
	const [error, setError] = useState<string | null>(null);
	const [selecciones, setSelecciones] = useState<FranjaSeleccionada[]>([]);
	const [guardando, setGuardando] = useState(false);
	const anio = mesVisible.getFullYear();
	const mes = mesVisible.getMonth();
	const rangoMeses = obtenerRangoMeses();
	const claveMesActual = fechaIso(rangoMeses.mesActual).slice(0, 7);
	const claveMes = `${anio}-${String(mes + 1).padStart(2, "0")}`;
	const inicio = fechaIso(new Date(anio, mes, 1));
	const fin = fechaIso(new Date(anio, mes + 1, 0));
	const formatoMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
	const puedeAvanzarMes = claveMes < claveMesActual || (claveMes === claveMesActual && rangoMeses.siguienteDisponible);
	const cantidadDias = new Date(anio, mes + 1, 0).getDate();
	const desplazamiento = (new Date(anio, mes, 1).getDay() + 6) % 7;
	const mapaListo = resultadoMapa.clave === `${partida.id}:${claveMes}`;
	const mapa = new Map(resultadoMapa.filas.map((fila) => [`${fila.fecha}:${fila.franja}`, fila]));
	const sesionesPartida = sesiones.filter((sesion) => sesion.partida_id === partida.id && sesion.fecha >= inicio && sesion.fecha <= fin);
	const hayFranjaCombinada = resultadoMapa.filas.some((fila) => {
		const clase = clasificarFranja(fila);
		return clase === "disponible" || clase === "posible";
	});
	const jugadoresFaltantes = Math.max(0, partida.participantesMax - partida.participantesCount);

	function cambiarMes(direccion: -1 | 1) {
		const siguiente = new Date(anio, mes + direccion, 1);
		if (direccion === 1 && !puedeAvanzarMes) return;
		setMesVisible(siguiente);
	}

	useEffect(() => {
		let activa = true;
		async function refrescarMapa() {
			try {
				const filas = await cargarMapaDisponibilidad(partida.id, inicio, fin);
				if (activa) {
					setResultadoMapa({ clave: `${partida.id}:${claveMes}`, filas });
					setError(null);
				}
			} catch (loadError) {
				if (activa) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el mapa de disponibilidad.");
			}
		}

		void refrescarMapa();
		const intervalo = window.setInterval(() => { void refrescarMapa(); }, 15_000);
		return () => {
			activa = false;
			window.clearInterval(intervalo);
		};
	}, [cargarMapaDisponibilidad, fin, inicio, partida.id, claveMes]);

	async function confirmarSesion() {
		if (selecciones.length === 0) return;
		setGuardando(true);
		try {
			await guardarSesiones(partida.id, selecciones);
			setSelecciones([]);
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la sesión.");
		} finally {
			setGuardando(false);
		}
	}

	async function quitarSesion(fecha: string, franja: FranjaHorario) {
		try {
			await borrarSesion(partida.id, fecha, franja);
		} catch (deleteError) {
			setError(deleteError instanceof Error ? deleteError.message : "No se pudo quitar la sesión.");
		}
	}

	return (
		<div className="agendamiento-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section className="agendamiento-dialog" role="dialog" aria-modal="true" aria-labelledby="agendamiento-title">
				<header className="agendamiento-header">
					<div><p className="seccion-etiqueta">Planificación de sesiones</p><h2 id="agendamiento-title">{partida.titulo}</h2></div>
					<button className="agendamiento-cerrar" type="button" onClick={onClose} aria-label="Cerrar">×</button>
				</header>
				{jugadoresFaltantes > 0 && <p className="agendamiento-aviso">La partida no está llena (faltan {jugadoresFaltantes} jugadores).</p>}
				{mapaListo && !hayFranjaCombinada && <p className="agendamiento-aviso">No hay ningún día disponible. Habla con tus jugadores.</p>}
				{!mapaListo && <p className="agendamiento-cargando" role="status">Calculando disponibilidad de los jugadores…</p>}
				{error && <p className="datos-error" role="alert">{error}</p>}
				<div className="agendamiento-mes">
					<button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" title="Consultar el mes anterior">‹</button>
					<h3>{formatoMes.format(mesVisible)}</h3>
					<button type="button" onClick={() => cambiarMes(1)} disabled={!puedeAvanzarMes} aria-label="Mes siguiente" title={puedeAvanzarMes ? "Ver el mes siguiente" : "Disponible durante los últimos tres días del mes actual"}>›</button>
				</div>
				<div className="agendamiento-grid" role="grid" aria-label={`Disponibilidad de ${formatoMes.format(mesVisible)}`}>
					{nombresDias.map((dia) => <div className="agendamiento-dia-semana" role="columnheader" key={dia}>{dia}</div>)}
					{Array.from({ length: desplazamiento }, (_, indice) => <div className="agendamiento-vacio" role="gridcell" aria-hidden="true" key={`empty-${indice}`} />)}
					{Array.from({ length: cantidadDias }, (_, indice) => {
						const fecha = fechaIso(new Date(anio, mes, indice + 1));
						return <div className="agendamiento-dia" role="gridcell" key={fecha}>
							<strong>{indice + 1}</strong>
							{(["manana", "tarde"] as const).map((franja) => {
								const slot = mapa.get(`${fecha}:${franja}`);
								const agendada = sesionesPartida.some((sesion) => sesion.fecha === fecha && sesion.franja === franja);
								const seleccionada = selecciones.some((item) => item.fecha === fecha && item.franja === franja);
								const fechaPasada = fecha < fechaIso(new Date());
								return <BotonFranja key={franja} fecha={fecha} franja={franja} respuestas={slot} agendada={agendada} fechaPasada={fechaPasada} seleccionada={Boolean(seleccionada)} onSelect={() => {
									if (agendada) void quitarSesion(fecha, franja);
									else {
										setSelecciones((anteriores) => seleccionada
											? anteriores.filter((item) => item.fecha !== fecha || item.franja !== franja)
											: [...anteriores, { fecha, franja }]);
										setError(null);
									}
								}} />;
							})}
						</div>;
					})}
				</div>
				<ul className="agendamiento-leyenda" aria-label="Leyenda de disponibilidad">
					<li><span className="leyenda-color heatmap-disponible" />Todos pueden</li>
					<li><span className="leyenda-color heatmap-posible" />Posible</li>
					<li><span className="leyenda-color heatmap-incompleta" />Sin responder</li>
					<li><span className="leyenda-color heatmap-no-disponible" />Alguien no puede</li>
					<li><span className="leyenda-color heatmap-seleccionada" />Sesión confirmada</li>
				</ul>
				{selecciones.length > 0 && <div className="agendamiento-confirmacion">
					<p>Confirmar {selecciones.length} {selecciones.length === 1 ? "franja" : "franjas"} de sesión.</p>
					<button type="button" disabled={guardando} onClick={() => { void confirmarSesion(); }}>{guardando ? "Guardando…" : "Confirmar sesiones"}</button>
				</div>}
			</section>
		</div>
	);
}
