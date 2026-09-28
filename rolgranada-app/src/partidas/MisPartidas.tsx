import { useState } from "react";
import { useRolData } from "../useRolData";
import type { Partida } from "../types";
import "./MisPartidas.css";

type Sesion = {
	fecha: Date;
	titulo: string;
	campana: string;
	hora: string;
};

const hoy = new Date();

const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function fechaClave(fecha: Date) {
	const mes = String(fecha.getMonth() + 1).padStart(2, "0");
	const dia = String(fecha.getDate()).padStart(2, "0");
	return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export default function MisPartidas() {
	const { usuario, partidas, desapuntarseDePartida } = useRolData();
	const [campanaActiva, setCampanaActiva] = useState(0);
	const [mesVisible, setMesVisible] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
	const misPartidas = partidas.filter((partida) => usuario.partidasInscritasIds.includes(partida.id));
	const indiceCampanaActiva = misPartidas.length ? campanaActiva % misPartidas.length : 0;
	const sesiones: Sesion[] = misPartidas.flatMap((partida) => {
		if (!partida.proximaSesion) return [];
		const fechaSesion = new Date(partida.proximaSesion);
		return Number.isNaN(fechaSesion.getTime()) ? [] : [{
			fecha: fechaSesion,
			titulo: "Sesión",
			campana: partida.titulo,
			hora: new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(fechaSesion),
		}];
	});
	const campana = misPartidas[indiceCampanaActiva];

	function moverCarrusel(direccion: number) {
		if (misPartidas.length === 0) return;
		setCampanaActiva((actual) => (actual + direccion + misPartidas.length) % misPartidas.length);
	}
	const inicioMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
	const desplazamientoInicio = (inicioMes.getDay() + 6) % 7;
	const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
	const totalCeldas = Math.ceil((desplazamientoInicio + diasEnMes) / 7) * 7;
	const calendarioDias = Array.from({ length: totalCeldas }, (_, indice) =>
		new Date(mesVisible.getFullYear(), mesVisible.getMonth(), indice - desplazamientoInicio + 1),
	);
	const sesionesPorFecha = new Map(sesiones.map((sesion) => [fechaClave(sesion.fecha), sesion]));
	const formatoMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

	return (
		<section className="mis-partidas" aria-labelledby="mis-partidas-titulo">
			<div className="mis-partidas-cabecera">
				<div>
					<p className="seccion-etiqueta">Partidas</p>
					<h1 className="page-title" id="mis-partidas-titulo">Mis Partidas</h1>
					<p>Campañas que estás preparando o siguiendo.</p>
				</div>
				<p className="campana-count">{misPartidas.length} {misPartidas.length === 1 ? "partida inscrita" : "partidas inscritas"}</p>
			</div>

			{campana ? (
				<>
				<div className="campanas-carrusel" aria-live="polite">
				<button className="carrusel-control" type="button" onClick={() => moverCarrusel(-1)} aria-label="Campaña anterior">
					‹
				</button>

				<article className="campana-tarjeta">
					<div className="campana-imagen" role="img" aria-label={`Placeholder de imagen para ${campana.titulo}`}>
						<img src={campana.imagenUrl} alt={`Imagen de ${campana.titulo}`} />
					</div>
					<div className="campana-contenido">
						<h2>{campana.titulo}</h2>
						<dl>
							<div><dt>Sistema:</dt><dd>{campana.sistema}</dd></div>
							<div><dt>DM:</dt><dd>{campana.dm}</dd></div>
							<div><dt>Participantes:</dt><dd>{campana.participantesActuales.length}/{campana.participantesMax}</dd></div>
							<div><dt>Siguiente Sesión:</dt><dd>{campana.proximaSesion ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campana.proximaSesion)) : "Por decidir"}</dd></div>
							<div><dt>Estado:</dt><dd>{etiquetaEstado(campana)}</dd></div>
						</dl>
						<div className="campana-descripcion">
							<h3>Descripción:</h3>
							<p>{campana.descripcion}</p>
						</div>
						<button className="abandonar-partida" type="button" onClick={() => desapuntarseDePartida(campana.id)}>Salir de la partida</button>
					</div>
				</article>

				<button className="carrusel-control" type="button" onClick={() => moverCarrusel(1)} aria-label="Siguiente campaña">
					›
				</button>
			</div>

			<div className="carrusel-indicadores" aria-label="Campaña seleccionada">
				{misPartidas.map((campanaItem, indice) => (
					<button
						key={campanaItem.titulo}
						className={indice === indiceCampanaActiva ? "indicador activo" : "indicador"}
						type="button"
						onClick={() => setCampanaActiva(indice)}
						aria-label={`Mostrar ${campanaItem.titulo}`}
						aria-current={indice === indiceCampanaActiva ? "true" : undefined}
					/>
				))}
				</div>
				</>
			) : <div className="mis-partidas-vacio"><h2>Aún no estás en ninguna partida</h2><p>Busca una campaña abierta y únete para verla aquí.</p></div>}

			<section className="calendario-sesiones" aria-labelledby="calendario-titulo">
				<div className="calendario-cabecera">
					<div>
						<p className="seccion-etiqueta">Agenda</p>
						<h2 className="section-title" id="calendario-titulo">Próximas sesiones</h2>
					</div>
					<div className="calendario-navegacion">
						<button type="button" onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1))} aria-label="Mes anterior">‹</button>
						<strong>{formatoMes.format(mesVisible)}</strong>
						<button type="button" onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1))} aria-label="Mes siguiente">›</button>
					</div>
				</div>

				<div className="calendario-grid" role="grid" aria-label={`Calendario de ${formatoMes.format(mesVisible)}`}>
					{diasSemana.map((dia) => <div className="calendario-dia-semana" role="columnheader" key={dia}>{dia}</div>)}
					{calendarioDias.map((fecha) => {
						const sesion = sesionesPorFecha.get(fechaClave(fecha));
						const perteneceAlMes = fecha.getMonth() === mesVisible.getMonth();
						return (
							<div
								className={`calendario-celda${perteneceAlMes ? "" : " fuera-de-mes"}${sesion ? " con-sesion" : ""}`}
								role="gridcell"
								key={fechaClave(fecha)}
							>
								<time dateTime={fechaClave(fecha)}>{fecha.getDate()}</time>
								{sesion && (
									<div className="evento-sesion">
										<strong>{sesion.titulo}</strong>
										<span>{sesion.campana}</span>
										<small>{sesion.hora}</small>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</section>
		</section>
	);
}

function etiquetaEstado(partida: Partida) {
	if (partida.estado === "en_curso") return "En curso";
	if (partida.estado === "finalizada") return "Finalizada";
	return "Abierta";
}
