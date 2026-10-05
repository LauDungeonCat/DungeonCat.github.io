import { useState } from "react";
import { useRolData } from "../useRolData";
import { useAuth } from "../auth/useAuth";
import type { Partida } from "../types";
import GestionPartida from "./GestionPartida";
import AvisoDisponibilidad from "./AvisoDisponibilidad";
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

function formatearSiguienteSesion(proximaSesion?: string): string {
    if (!proximaSesion) return "Por decidir";

    const fecha = new Date(proximaSesion);
    // Detectamos la franja de mañana o tarde según el valor de la fecha u hora
    const esManana = proximaSesion.includes("manana") || fecha.getHours() < 15;
    const franjaTexto = esManana ? "Mañana" : "Tarde";

    const fechaFormateada = new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(fecha);

    return `${fechaFormateada} (${franjaTexto})`;
}

export default function MisPartidas({ onCrearCampana, onEditarCampana }: { onCrearCampana: () => void; onEditarCampana: (partida: Partida) => void }) {
    const { usuario, partidas, sesiones: sesionesAgendadas, loading, error, desapuntarseDePartida, eliminarPartida } = useRolData();
    const { requestLogin } = useAuth();
    const [campanaActiva, setCampanaActiva] = useState(0);
    const [mesVisible, setMesVisible] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const misPartidas = partidas.filter((partida) => usuario?.partidasInscritasIds.includes(partida.id) || partida.dmId === usuario?.id);
    const indiceCampanaActiva = misPartidas.length ? campanaActiva % misPartidas.length : 0;
    const sesiones: Sesion[] = sesionesAgendadas.map((sesion) => ({
        fecha: new Date(`${sesion.fecha}T12:00:00`),
        titulo: `Sesión · ${sesion.franja === "manana" ? "Mañana" : "Tarde"}`,
        campana: sesion.titulo_partida,
        hora: sesion.franja === "manana" ? "Mañana" : "Tarde",
    }));
    const campana = misPartidas[indiceCampanaActiva];

    function moverCarrusel(direccion: number) {
        if (misPartidas.length === 0) return;
        setCampanaActiva((actual) => (actual + direccion + misPartidas.length) % misPartidas.length);
    }

    async function borrarCampana(partida: Partida) {
        if (!window.confirm(`¿Quieres borrar la campaña "${partida.titulo}"? Esta acción no se puede deshacer.`)) return;
        try {
            await eliminarPartida(partida.id);
        } catch {
            return;
        }
    }
    const inicioMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const desplazamientoInicio = (inicioMes.getDay() + 6) % 7;
    const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    const totalCeldas = Math.ceil((desplazamientoInicio + diasEnMes) / 7) * 7;
    const calendarioDias = Array.from({ length: totalCeldas }, (_, indice) =>
        new Date(mesVisible.getFullYear(), mesVisible.getMonth(), indice - desplazamientoInicio + 1),
    );
    const sesionesPorFecha = new Map<string, Sesion[]>();
    for (const sesion of sesiones) {
        const clave = fechaClave(sesion.fecha);
        sesionesPorFecha.set(clave, [...(sesionesPorFecha.get(clave) ?? []), sesion]);
    }
    const formatoMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

    if (loading) return <section className="mis-partidas" role="status">Cargando tus partidas…</section>;

    return (
        <section className="mis-partidas" aria-labelledby="mis-partidas-titulo">
            <div className="mis-partidas-cabecera">
                <div>
                    <p className="seccion-etiqueta">Partidas</p>
                    <h1 className="page-title" id="mis-partidas-titulo">Mis Partidas</h1>
                    <p>Campañas que estás preparando o siguiendo.</p>
                </div>
                <div className="mis-partidas-cabecera-acciones">
                    {usuario && <button className="mis-partidas-crear" type="button" onClick={onCrearCampana}>Crear campaña</button>}
                    <p className="campana-count">{misPartidas.length} {misPartidas.length === 1 ? "partida inscrita" : "partidas inscritas"}</p>
                </div>
            </div>
            {error && <p className="datos-error" role="alert">{error}</p>}
            <AvisoDisponibilidad disponibilidad={usuario?.disponibilidad} sesiones={sesionesAgendadas} />

            {campana ? (
                <div className="campanas-carrusel-wrapper">
                    <div className="campanas-carrusel" aria-live="polite">
                        <button 
                            className="carrusel-control anterior" 
                            type="button" 
                            onClick={() => moverCarrusel(-1)} 
                            aria-label="Anterior campaña"
                        />

                        <article className="campana-tarjeta">
                            <div className="campana-imagen" role="img" aria-label={`Placeholder de imagen para ${campana.titulo}`}>
                                <img src={campana.imagenUrl} alt={`Imagen de ${campana.titulo}`} />
                            </div>
                            <div className="campana-contenido">
                                <h2>{campana.titulo}</h2>
                                <dl>
                                    <div><dt>Sistema:</dt><dd>{campana.sistema}</dd></div>
                                    <div><dt>DM:</dt><dd>{campana.dm}</dd></div>
                                    <div><dt>Siguiente Sesión:</dt><dd>{formatearSiguienteSesion(campana.proximaSesion)}</dd></div>
                                    <div><dt>Zona aproximada:</dt><dd>{campana.ubicacionAproximada}</dd></div>
                                    <div><dt>Sesiones al mes:</dt><dd>{campana.sesionesAlMes}</dd></div>
                                    {campana.duracionEstimada && <div><dt>Duración estimada:</dt><dd>{campana.duracionEstimada}</dd></div>}
                                    {campana.ubicacionExacta && <div><dt>Ubicación exacta:</dt><dd>{campana.ubicacionExacta}</dd></div>}
                                    <div><dt>Estado:</dt><dd>{etiquetaEstado(campana)}</dd></div>
                                </dl>
                                <div className="campana-descripcion">
                                    <h3>Descripción:</h3>
                                    <p>{campana.descripcion}</p>
                                </div>
                                {campana.dmId === usuario?.id && (
                                    <div className="mis-partidas-acciones-campana">
                                        <button type="button" onClick={() => onEditarCampana(campana)}>Editar campaña</button>
                                        <button type="button" className="mis-partidas-eliminar" onClick={() => { void borrarCampana(campana); }}>Eliminar campaña</button>
                                    </div>
                                )}
                                {campana.viewerIsParticipant && campana.dmId !== usuario?.id && <button className="abandonar-partida" type="button" onClick={() => { void desapuntarseDePartida(campana.id).catch(() => undefined); }}>Salir de la partida</button>}
                                {campana.dmId === usuario?.id && <GestionPartida key={campana.id} partida={campana} />}
                            </div>
                        </article>

                        <button 
                            className="carrusel-control siguiente" 
                            type="button" 
                            onClick={() => moverCarrusel(1)} 
                            aria-label="Siguiente campaña"
                        />
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
                </div>
            ) : <div className="mis-partidas-vacio"><h2>{usuario ? "Aún no estás en ninguna partida" : "Inicia sesión para ver tus partidas"}</h2><p>{usuario ? "Busca una campaña abierta y únete para verla aquí." : "La navegación es pública; tus campañas personales requieren una cuenta."}</p>{!usuario && <button type="button" onClick={requestLogin}>Acceder</button>}</div>}

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
                        const sesionesDia = sesionesPorFecha.get(fechaClave(fecha)) ?? [];
                        const perteneceAlMes = fecha.getMonth() === mesVisible.getMonth();
                        return (
                            <div
                                className={`calendario-celda${perteneceAlMes ? "" : " fuera-de-mes"}${sesionesDia.length ? " con-sesion" : ""}`}
                                role="gridcell"
                                key={fechaClave(fecha)}
                            >
                                <time dateTime={fechaClave(fecha)}>{fecha.getDate()}</time>
                                {sesionesDia.map((sesion) => <div className="evento-sesion" key={`${sesion.campana}-${sesion.hora}`}>
                                    <strong>{sesion.titulo}</strong>
                                    <span>{sesion.campana}</span>
                                </div>)}
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