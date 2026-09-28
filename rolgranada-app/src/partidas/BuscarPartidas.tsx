import { useState } from "react";
import { useRolData } from "../useRolData";
import "./BuscarPartidas.css";

export default function BuscarPartidas() {
	const { usuario, partidas, unirseAPartida } = useRolData();
	const [busqueda, setBusqueda] = useState("");
	const termino = busqueda.trim().toLocaleLowerCase("es");
	const partidasAbiertas = partidas.filter((partida) => {
		if (partida.estado !== "abierta") return false;
		return `${partida.titulo} ${partida.sistema}`.toLocaleLowerCase("es").includes(termino);
	});

	return (
		<section className="buscar-partidas" aria-labelledby="buscar-partidas-titulo">
			<header className="buscar-partidas-cabecera">
				<div>
					<p className="seccion-etiqueta">Partidas</p>
					<h1 className="page-title" id="buscar-partidas-titulo">Buscar Partidas</h1>
					<p>Encuentra una campaña abierta y únete a la aventura.</p>
				</div>
				<label className="buscar-partidas-busqueda">
					<span>Buscar por título o sistema</span>
					<input
						type="search"
						value={busqueda}
						onChange={(event) => setBusqueda(event.target.value)}
						placeholder="Ej. Pathfinder"
					/>
				</label>
			</header>

			<p className="buscar-partidas-contador">{partidasAbiertas.length} {partidasAbiertas.length === 1 ? "partida abierta" : "partidas abiertas"}</p>

			{partidasAbiertas.length > 0 ? (
				<div className="partidas-catalogo">
					{partidasAbiertas.map((partida) => {
						const yaInscrito = usuario.partidasInscritasIds.includes(partida.id);
						const completa = partida.participantesActuales.length >= partida.participantesMax;
						return (
							<article className="partida-catalogo-card" key={partida.id}>
								<div className="partida-catalogo-imagen">
									<img src={partida.imagenUrl} alt={`Imagen de ${partida.titulo}`} loading="lazy" />
									<span>Campaña abierta</span>
								</div>
								<div className="partida-catalogo-contenido">
									<div className="partida-catalogo-titulo">
										<div>
											<p className="partida-sistema">{partida.sistema}</p>
											<h2>{partida.titulo}</h2>
										</div>
										<span className="partida-aforo">{partida.participantesActuales.length}/{partida.participantesMax}</span>
									</div>
									<p className="partida-dm">Dirige: {partida.dm}</p>
									<p className="partida-descripcion">{partida.descripcion}</p>
									<div className="partida-catalogo-pie">
										<p>{partida.proximaSesion ? `Próxima sesión: ${new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(partida.proximaSesion))}` : "Fecha por decidir"}</p>
										<button
											type="button"
											onClick={() => unirseAPartida(partida.id)}
											disabled={yaInscrito || completa}
											title={completa && !yaInscrito ? "La partida está completa" : undefined}
										>
											{yaInscrito ? "Ya estás inscrito" : completa ? "Partida completa" : "Unirse a la partida"}
										</button>
									</div>
								</div>
							</article>
						);
					})}
				</div>
			) : (
				<div className="buscar-partidas-vacio">
					<h2>No hay partidas que coincidan</h2>
					<p>Prueba otro título o sistema de juego.</p>
				</div>
			)}
		</section>
	);
}
