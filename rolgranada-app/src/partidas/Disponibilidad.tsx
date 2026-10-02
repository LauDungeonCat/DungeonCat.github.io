import { useEffect, useState, type FormEvent } from "react";
import { useRolData } from "../useRolData";
import { useAuth } from "../auth/useAuth";
import type { CambioDisponibilidad, FranjaEstado, FranjaHorario } from "../types";
import { obtenerRangoMeses } from "./rangoMeses";
import "./Disponibilidad.css";

type PlantillaRapida = {
	estado: FranjaEstado;
	dias: "diario" | "findes" | "todos";
	franja: FranjaHorario | "todo-dia";
	mesOrigen: string;
};

const CLAVE_PLANTILLA = "rol-granada-plantilla-rapida";
const CLAVE_PLANTILLA_DESCARTADA = "rol-granada-plantilla-rapida-descartada";
const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const nombresEstado: Record<FranjaEstado, string> = {
	puedo: "Puedo",
	podria: "Podría / No conveniente",
	no_puedo: "No puedo",
};

function claveMes(fecha: Date) {
	return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

function esMesSiguiente(mesOrigen: string, mesDestino: string) {
	const [anio, mes] = mesOrigen.split("-").map(Number);
	return claveMes(new Date(anio, mes, 1)) === mesDestino;
}

function claveDia(fecha: Date) {
	return `${claveMes(fecha)}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function leerAlmacen<T>(clave: string, fallback: T): T {
	try {
		const guardado = localStorage.getItem(clave);
		return guardado ? JSON.parse(guardado) as T : fallback;
	} catch {
		return fallback;
	}
}

function siguienteEstado(estado?: FranjaEstado): FranjaEstado {
	if (!estado) return "puedo";
	if (estado === "puedo") return "podria";
	if (estado === "podria") return "no_puedo";
	return "puedo";
}

function esDiaSeleccionado(fecha: Date, dias: PlantillaRapida["dias"]) {
	const dia = fecha.getDay();
	if (dias === "todos") return true;
	if (dias === "findes") return dia === 0 || dia === 6;
	return dia >= 1 && dia <= 5;
}

function reglaAnteriorCubierta(anterior: PlantillaRapida, nueva: Omit<PlantillaRapida, "mesOrigen">) {
	const cubreDias = nueva.dias === "todos" || nueva.dias === anterior.dias;
	const cubreFranjas = nueva.franja === "todo-dia" || nueva.franja === anterior.franja;
	return cubreDias && cubreFranjas;
}

export default function Disponibilidad() {
	const { usuario, sesiones, loading, error, actualizarDisponibilidad, actualizarDisponibilidades, limpiarDisponibilidad } = useRolData();
	const { requestLogin } = useAuth();
	const [mesVisible, setMesVisible] = useState(() => obtenerRangoMeses().mesInicial);
	const [plantillas, setPlantillas] = useState<PlantillaRapida[]>(() => {
		const guardadas = leerAlmacen<PlantillaRapida | PlantillaRapida[] | null>(CLAVE_PLANTILLA, null);
		if (!guardadas) return [];
		return Array.isArray(guardadas) ? guardadas : [guardadas];
	});
	const [mesPlantillaDescartada, setMesPlantillaDescartada] = useState<string | null>(
		() => leerAlmacen<string | null>(CLAVE_PLANTILLA_DESCARTADA, null),
	);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [estadoFormulario, setEstadoFormulario] = useState<FranjaEstado>("puedo");
	const [diasFormulario, setDiasFormulario] = useState<PlantillaRapida["dias"]>("diario");
	const [franjaFormulario, setFranjaFormulario] = useState<PlantillaRapida["franja"]>("manana");

	useEffect(() => {
		localStorage.setItem(CLAVE_PLANTILLA, JSON.stringify(plantillas));
	}, [plantillas]);

	const ahora = new Date();
	const hoyInicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
	const rangoMeses = obtenerRangoMeses(ahora);
	const claveVisible = claveMes(mesVisible);
	const claveActual = claveMes(rangoMeses.mesActual);
	const claveSiguiente = claveMes(rangoMeses.mesSiguiente);
	const sesionesConfirmadas = new Set(sesiones.map((sesion) => `${sesion.fecha}:${sesion.franja}`));
	const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
	const calendarioCompleto = Array.from({ length: diasEnMes }, (_, indice) =>
		new Date(mesVisible.getFullYear(), mesVisible.getMonth(), indice + 1),
	).every((fecha) => {
		if (fecha < hoyInicioDia) return true;
		const fechaDia = claveDia(fecha);
		return (["manana", "tarde"] as const).every((franja) =>
			sesionesConfirmadas.has(`${fechaDia}:${franja}`) || Boolean(usuario?.disponibilidad[fechaDia]?.[franja]),
		);
	});
	const mostrarPlantillaAnterior = Boolean(usuario)
		&& !calendarioCompleto
		&& mesPlantillaDescartada !== claveVisible
		&& plantillas.some((regla) => esMesSiguiente(regla.mesOrigen, claveVisible));
	const desplazamiento = (new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1).getDay() + 6) % 7;
	const totalCeldas = Math.ceil((desplazamiento + diasEnMes) / 7) * 7;
	const diasCalendario = Array.from({ length: totalCeldas }, (_, indice) => {
		const numeroDia = indice - desplazamiento + 1;
		return numeroDia > 0 && numeroDia <= diasEnMes
			? new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numeroDia)
			: null;
	});
	const formatoMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

	function cambiarMes(direccion: -1 | 1) {
		const nuevoMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + direccion, 1);
		const claveDestino = claveMes(nuevoMes);
		if (claveDestino !== claveActual && !(rangoMeses.siguienteDisponible && claveDestino === claveSiguiente)) return;
		setMesVisible(nuevoMes);
	}

	async function cambiarFranja(fecha: Date, franja: FranjaHorario) {
		if (!usuario) {
			requestLogin();
			return;
		}
		const dia = claveDia(fecha);
		const diaActual = usuario.disponibilidad[dia];
		try {
			await actualizarDisponibilidad(dia, { [franja]: siguienteEstado(diaActual?.[franja]) });
		} catch {
			return;
		}
	}

	async function aplicarReglas(reglas: Omit<PlantillaRapida, "mesOrigen">[]) {
		const cambiosPorFecha = new Map<string, CambioDisponibilidad>();
		for (const configuracion of reglas) {
			for (let numeroDia = 1; numeroDia <= diasEnMes; numeroDia += 1) {
				const fecha = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numeroDia);
				if (!esDiaSeleccionado(fecha, configuracion.dias)) continue;
				const clave = claveDia(fecha);
				const cambios = cambiosPorFecha.get(clave) ?? { fecha: clave };
				if (configuracion.franja === "manana" || configuracion.franja === "todo-dia") cambios.manana = configuracion.estado;
				if (configuracion.franja === "tarde" || configuracion.franja === "todo-dia") cambios.tarde = configuracion.estado;
				cambiosPorFecha.set(clave, cambios);
			}
		}
		await actualizarDisponibilidades([...cambiosPorFecha.values()]);
	}

	async function enviarRellenoRapido(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!usuario) {
			requestLogin();
			return;
		}
		const regla = { estado: estadoFormulario, dias: diasFormulario, franja: franjaFormulario };
		try {
			await aplicarReglas([regla]);
		} catch {
			return;
		}
		setPlantillas((anteriores) => [
			...anteriores.filter((anterior) => !reglaAnteriorCubierta(anterior, regla)),
			{ ...regla, mesOrigen: claveVisible },
		]);
		setModalAbierto(false);
	}

	async function usarPlantillasAnteriores() {
		if (!usuario) {
			requestLogin();
			return;
		}
		try {
			await aplicarReglas(plantillas);
		} catch {
			return;
		}
		setPlantillas((anteriores) => anteriores.map((regla) => ({ ...regla, mesOrigen: claveVisible })));
	}

	function noUsarPlantillaAnterior() {
		setMesPlantillaDescartada(claveVisible);
		try {
			localStorage.setItem(CLAVE_PLANTILLA_DESCARTADA, JSON.stringify(claveVisible));
		} catch {
			return;
		}
	}

	async function vaciarCalendario() {
		if (!usuario) {
			requestLogin();
			return;
		}
		if (window.confirm("¿Quieres borrar toda la disponibilidad de todos los meses?")) {
			try {
				await limpiarDisponibilidad();
			} catch {
				return;
			}
		}
	}

	function iconoEstado(sesionConfirmada: boolean, estado?: FranjaEstado) {
		if (sesionConfirmada) return "★";
		if (estado === "puedo") return "✓";
		if (estado === "podria") return "⊙";
		if (estado === "no_puedo") return "×";
		return "·";
	}

	if (loading) return <section className="disponibilidad-page" role="status">Cargando disponibilidad…</section>;

	return (
		<section className="disponibilidad-page" aria-labelledby="disponibilidad-title">
			<header className="disponibilidad-heading">
				<div>
					<p className="seccion-etiqueta">Partidas · Vista de jugador</p>
					<h1 className="page-title" id="disponibilidad-title">Disponibilidad</h1>
					<p>Indica cuándo te viene bien jugar. Pulsa cada franja para cambiar su estado.</p>
				</div>
				<div className="disponibilidad-heading-actions">
					<button className="relleno-rapido-trigger" type="button" onClick={() => setModalAbierto(true)}>
						Relleno Rápido
					</button>
					<button className="vaciar-calendario-button" type="button" onClick={vaciarCalendario}>
						Vaciar calendario
					</button>
				</div>
			</header>
			{!usuario && <p className="availability-login-note">El calendario es público. Inicia sesión para guardar tu disponibilidad. <button type="button" onClick={requestLogin}>Acceder</button></p>}
			{error && <p className="datos-error" role="alert">{error}</p>}

			{mostrarPlantillaAnterior && (
				<div className="plantilla-banner" role="status">
					<span>¿Usar la misma plantilla de Relleno Rápido del mes pasado?</span>
					<div className="plantilla-banner-acciones">
						<button type="button" onClick={usarPlantillasAnteriores}>Usar plantilla</button>
						<button type="button" className="plantilla-banner-rechazar" onClick={noUsarPlantillaAnterior}>No usar plantilla</button>
					</div>
				</div>
			)}

			<section className="disponibilidad-calendar" aria-label="Calendario de disponibilidad">
				<div className="disponibilidad-calendar-header">
					<h2 className="section-title">{formatoMes.format(mesVisible)}</h2>
					<div className="calendar-month-actions">
						{rangoMeses.siguienteDisponible && claveVisible === claveSiguiente && (
							<button type="button" onClick={() => cambiarMes(-1)} aria-label="Volver al mes actual">‹</button>
						)}
						<button
							type="button"
							onClick={() => cambiarMes(1)}
							disabled={!rangoMeses.siguienteDisponible || claveVisible !== claveActual}
							aria-label="Ver el próximo mes"
							title={rangoMeses.siguienteDisponible ? "Ver el próximo mes" : "Disponible durante los últimos tres días del mes"}
						>
							›
						</button>
					</div>
				</div>

				<div className="availability-grid" role="grid" aria-label={`Disponibilidad de ${formatoMes.format(mesVisible)}`}>
					{diasSemana.map((dia) => <div className="availability-weekday" role="columnheader" key={dia}>{dia}</div>)}
					{diasCalendario.map((fecha, indice) => {
						if (!fecha) return <div className="availability-empty-cell" role="gridcell" aria-hidden="true" key={`vacio-${indice}`} />;
						const clave = claveDia(fecha);
						const diaDisponibilidad = usuario?.disponibilidad[clave];
						const estados = diaDisponibilidad as Partial<Record<FranjaHorario, FranjaEstado>> | undefined;
						const esPasado = fecha < hoyInicioDia;

						return (
							<div className={`availability-day${esPasado ? " dia-pasado" : ""}`} role="gridcell" key={clave}>
								<span className="availability-day-number">{fecha.getDate()}</span>
								{(["manana", "tarde"] as const).map((franja) => {
									const estado = diaDisponibilidad?.franjasMarcadas?.includes(franja) ? estados?.[franja] : undefined;
									const sesionConfirmada = sesionesConfirmadas.has(`${clave}:${franja}`);
									const nombreFranja = franja === "manana" ? "Mañana" : "Tarde";
									
									// Determinamos las clases CSS aplicables
									let claseEstado = "";
									if (sesionConfirmada) {
										claseEstado = " estado-sesion";
									} else if (estado) {
										claseEstado = ` estado-${estado.replace("_", "-")}`;
									}

									return (
										<button
											key={franja}
											className={`availability-slot${claseEstado}`}
											type="button"
											disabled={esPasado || sesionConfirmada}
											onClick={() => cambiarFranja(fecha, franja)}
											aria-label={`${fecha.getDate()} de ${formatoMes.format(mesVisible)}, ${nombreFranja}: ${sesionConfirmada ? "sesión confirmada" : estado ? nombresEstado[estado] : "sin marcar"}.`}
											title={sesionConfirmada ? `${nombreFranja}: sesión confirmada` : `${nombreFranja}: ${estado ? nombresEstado[estado] : "sin marcar"}`}
										>
											<span className="availability-slot-label">{nombreFranja}</span>
											<span className="availability-slot-icon" aria-hidden="true">
												{iconoEstado(sesionConfirmada, estado)}
											</span>
										</button>
									);
								})}
							</div>
						);
					})}
				</div>
			</section>

			<ul className="availability-legend" aria-label="Leyenda de disponibilidad">
				<li><span className="legend-swatch estado-puedo">✓</span>Puedo</li>
				<li><span className="legend-swatch estado-podria">⊙</span>Podría / No conveniente</li>
				<li><span className="legend-swatch estado-no-puedo">×</span>No puedo</li>
				<li><span className="legend-swatch estado-sesion">★</span>Hay Sesión</li>
			</ul>

			{modalAbierto && (
				<div className="quick-fill-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalAbierto(false); }}>
					<section className="quick-fill-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-fill-title">
						<div className="quick-fill-dialog-header">
							<div>
								<p className="seccion-etiqueta">Automatiza tu calendario</p>
								<h2 className="section-title" id="quick-fill-title">Relleno Rápido</h2>
							</div>
							<button className="quick-fill-close" type="button" onClick={() => setModalAbierto(false)} aria-label="Cerrar">×</button>
						</div>
						<form onSubmit={enviarRellenoRapido}>
							<p className="quick-fill-sentence">
								<select aria-label="Disponibilidad" value={estadoFormulario} onChange={(event) => setEstadoFormulario(event.target.value as FranjaEstado)}>
									<option value="puedo">Puedo</option>
									<option value="no_puedo">No puedo</option>
									<option value="podria">Podría</option>
								</select>
								en 
								<select aria-label="Días" value={diasFormulario} onChange={(event) => setDiasFormulario(event.target.value as PlantillaRapida["dias"])}>
									<option value="diario">días de diario</option>
									<option value="findes">findes</option>
									<option value="todos">todos los días</option>
								</select>
								por
								<select aria-label="Franja horaria" value={franjaFormulario} onChange={(event) => setFranjaFormulario(event.target.value as PlantillaRapida["franja"])}>
									<option value="manana">la mañana</option>
									<option value="tarde">la tarde</option>
									<option value="todo-dia">todo el día</option>
								</select>
								.
							</p>
							<p className="quick-fill-note">Se aplicará al mes visible. Después podrás ajustar cada franja por separado.</p>
							<div className="quick-fill-actions">
								<button className="quick-fill-cancel" type="button" onClick={() => setModalAbierto(false)}>Cancelar</button>
								<button className="relleno-rapido-trigger" type="submit">Aplicar plantilla</button>
							</div>
						</form>
					</section>
				</div>
			)}
		</section>
	);
}