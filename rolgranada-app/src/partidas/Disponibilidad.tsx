import { useEffect, useState, type FormEvent } from "react";
import { useRolData } from "../useRolData";
import type { FranjaEstado, FranjaHorario } from "../types";
import "./Disponibilidad.css";

type PlantillaRapida = {
	estado: FranjaEstado;
	dias: "diario" | "findes" | "todos";
	franja: FranjaHorario | "todo-dia";
	mesOrigen: string;
};

const CLAVE_PLANTILLA = "rol-granada-plantilla-rapida";
const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const nombresEstado: Record<FranjaEstado, string> = {
	puedo: "Puedo",
	podria: "Podría / No conveniente",
	no_puedo: "No puedo",
};

function claveMes(fecha: Date) {
	return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
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

export default function Disponibilidad() {
	const { usuario, actualizarDisponibilidad } = useRolData();
	const [mesVisible, setMesVisible] = useState(() => {
		const ahora = new Date();
		return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
	});
	const [plantilla, setPlantilla] = useState<PlantillaRapida | null>(() => leerAlmacen<PlantillaRapida | null>(CLAVE_PLANTILLA, null));
	const [modalAbierto, setModalAbierto] = useState(false);
	const [estadoFormulario, setEstadoFormulario] = useState<FranjaEstado>("puedo");
	const [diasFormulario, setDiasFormulario] = useState<PlantillaRapida["dias"]>("diario");
	const [franjaFormulario, setFranjaFormulario] = useState<PlantillaRapida["franja"]>("manana");

	useEffect(() => {
		if (plantilla) localStorage.setItem(CLAVE_PLANTILLA, JSON.stringify(plantilla));
	}, [plantilla]);

	const hoy = new Date();
	const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
	const diasRestantes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() - hoy.getDate();
	const puedeAbrirMesSiguiente = diasRestantes <= 3;
	const claveVisible = claveMes(mesVisible);
	const claveActual = claveMes(mesActual);
	const mostrarPlantillaAnterior = Boolean(plantilla && plantilla.mesOrigen !== claveVisible);
	const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
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
		if (direccion === 1 && (!puedeAbrirMesSiguiente || claveVisible !== claveActual)) return;
		if (direccion === -1 && claveVisible === claveActual) return;
		setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + direccion, 1));
	}

	function cambiarFranja(fecha: Date, franja: FranjaHorario) {
		const dia = claveDia(fecha);
		const diaActual = usuario.disponibilidad[dia];
		actualizarDisponibilidad(dia, { [franja]: siguienteEstado(diaActual?.[franja]) });
	}

	function aplicarPlantilla(configuracion: Omit<PlantillaRapida, "mesOrigen">) {
		for (let numeroDia = 1; numeroDia <= diasEnMes; numeroDia += 1) {
			const fecha = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numeroDia);
			if (!esDiaSeleccionado(fecha, configuracion.dias)) continue;
			const cambios: Partial<Record<FranjaHorario, FranjaEstado>> = {};
			if (configuracion.franja === "manana" || configuracion.franja === "todo-dia") cambios.manana = configuracion.estado;
			if (configuracion.franja === "tarde" || configuracion.franja === "todo-dia") cambios.tarde = configuracion.estado;
			actualizarDisponibilidad(claveDia(fecha), cambios);
		}
		setPlantilla({ ...configuracion, mesOrigen: claveVisible });
	}

	function enviarRellenoRapido(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		aplicarPlantilla({ estado: estadoFormulario, dias: diasFormulario, franja: franjaFormulario });
		setModalAbierto(false);
	}

	function iconoEstado(estado?: FranjaEstado) {
		if (estado === "puedo") return "✓";
		if (estado === "podria") return "⊙";
		if (estado === "no_puedo") return "×";
		return "·";
	}

	return (
		<section className="disponibilidad-page" aria-labelledby="disponibilidad-title">
			<header className="disponibilidad-heading">
				<div>
					<p className="seccion-etiqueta">Partidas · Vista de jugador</p>
					<h1 className="page-title" id="disponibilidad-title">Disponibilidad</h1>
					<p>Indica cuándo te viene bien jugar. Pulsa cada franja para cambiar su estado.</p>
				</div>
				<button className="relleno-rapido-trigger" type="button" onClick={() => setModalAbierto(true)}>
					Relleno Rápido
				</button>
			</header>

			{mostrarPlantillaAnterior && plantilla && (
				<div className="plantilla-banner" role="status">
					<span>¿Usar la misma plantilla de Relleno Rápido del mes pasado?</span>
					<button type="button" onClick={() => aplicarPlantilla(plantilla)}>Usar plantilla</button>
				</div>
			)}

			<section className="disponibilidad-calendar" aria-label="Calendario de disponibilidad">
				<div className="disponibilidad-calendar-header">
					<h2 className="section-title">{formatoMes.format(mesVisible)}</h2>
					<div className="calendar-month-actions">
						{claveVisible !== claveActual && (
							<button type="button" onClick={() => cambiarMes(-1)} aria-label="Volver al mes actual">‹</button>
						)}
						<button
							type="button"
							onClick={() => cambiarMes(1)}
							disabled={!puedeAbrirMesSiguiente || claveVisible !== claveActual}
							aria-label="Ver el próximo mes"
							title={puedeAbrirMesSiguiente ? "Ver el próximo mes" : "Disponible durante los últimos tres días del mes"}
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
						const diaDisponibilidad = usuario.disponibilidad[clave];
						const estados = diaDisponibilidad ?? {};
						return (
							<div className="availability-day" role="gridcell" key={clave}>
								<span className="availability-day-number">{fecha.getDate()}</span>
								{(["manana", "tarde"] as const).map((franja) => {
									const estado = diaDisponibilidad?.franjasMarcadas?.includes(franja) ? estados[franja] : undefined;
									const nombreFranja = franja === "manana" ? "Mañana" : "Tarde";
									return (
										<button
											key={franja}
											className={`availability-slot${estado ? ` estado-${estado.replace("_", "-")}` : ""}`}
											type="button"
											onClick={() => cambiarFranja(fecha, franja)}
											aria-label={`${fecha.getDate()} de ${formatoMes.format(mesVisible)}, ${nombreFranja}: ${estado ? nombresEstado[estado] : "sin marcar"}. Cambiar estado`}
											title={`${nombreFranja}: ${estado ? nombresEstado[estado] : "sin marcar"}`}
										>
											<span className="availability-slot-label">{nombreFranja}</span>
											<span className="availability-slot-icon" aria-hidden="true">{iconoEstado(estado)}</span>
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
