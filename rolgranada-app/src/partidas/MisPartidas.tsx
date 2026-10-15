import { useState } from "react";
import { useRolData } from "../useRolData";
import { useAuth } from "../auth/useAuth";
import type { Partida } from "../types";
import GestionPartida from "./GestionPartida";
import AvisoDisponibilidad from "./AvisoDisponibilidad";
import FormularioPartida from "./FormularioPartida";
import CalendarioSesiones, { type Sesion } from "./CalendarioSesiones";
import "./MisPartidas.css";

function obtenerTextoProximaSesion(tituloPartida: string, sesiones: Array<{ fecha: string; franja: string; titulo_partida: string }>): string {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);

    const sesionesPartida = sesiones
        .filter((s) => s.titulo_partida === tituloPartida)
        .map((s) => ({
            ...s,
            objetoFecha: new Date(`${s.fecha}T12:00:00`),
        }))
        .sort((a, b) => a.objetoFecha.getTime() - b.objetoFecha.getTime());

    if (sesionesPartida.length === 0) return "Por decidir";

    const proxima = sesionesPartida.find((s) => s.objetoFecha >= ahora) ?? sesionesPartida[0];
    const franjaTexto = proxima.franja === "manana" ? "Mañana" : "Tarde";
    const fechaFormateada = new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(proxima.objetoFecha);

    return `${fechaFormateada} (${franjaTexto})`;
}

export default function MisPartidas() {
    const { usuario, partidas, sesiones: sesionesAgendadas, loading, error, desapuntarseDePartida } = useRolData();
    const { requestLogin } = useAuth();
    const [campanaActiva, setCampanaActiva] = useState(0);
    
    const [mostrarCrear, setMostrarCrear] = useState(false);
    const [partidaEditando, setPartidaEditando] = useState<Partida | null>(null);
    const [partidaAEliminar, setPartidaAEliminar] = useState<Partida | null>(null);
    
    const misPartidas = partidas.filter((partida) => usuario?.partidasInscritasIds.includes(partida.id) || partida.dmId === usuario?.id);
    const indiceCampanaActiva = misPartidas.length ? campanaActiva % misPartidas.length : 0;
    
    const sesiones: Sesion[] = sesionesAgendadas.map((sesion) => {
        const partidaAsociada = partidas.find((p) => p.titulo === sesion.titulo_partida);
        return {
            fecha: new Date(`${sesion.fecha}T12:00:00`),
            titulo: `Sesión · ${sesion.franja === "manana" ? "Mañana" : "Tarde"}`,
            campana: sesion.titulo_partida,
            hora: sesion.franja === "manana" ? "Mañana" : "Tarde",
            sistema: partidaAsociada?.sistema,
            ubicacion: partidaAsociada?.ubicacionExacta ?? undefined,
        };
    });
    
    const campana = misPartidas[indiceCampanaActiva];

    function moverCarrusel(direccion: number) {
        if (misPartidas.length === 0) return;
        setCampanaActiva((actual) => (actual + direccion + misPartidas.length) % misPartidas.length);
    }

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
                    {usuario && <button className="mis-partidas-crear" type="button" onClick={() => setMostrarCrear(true)}>Crear campaña</button>}
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
                                    <div><dt>Siguiente Sesión:</dt><dd>{obtenerTextoProximaSesion(campana.titulo, sesionesAgendadas)}</dd></div>
                                    <div><dt>Sesiones al mes:</dt><dd>{campana.sesionesAlMes}</dd></div>
                                    {campana.duracionEstimada && <div><dt>Duración estimada:</dt><dd>{campana.duracionEstimada}</dd></div>}
                                    {campana.ubicacionExacta && <div><dt>Ubicación:</dt><dd>{campana.ubicacionExacta}</dd></div>}
                                </dl>
                                <div className="campana-descripcion">
                                    <h3>Descripción:</h3>
                                    <p>{campana.descripcion}</p>
                                </div>
                                
                                {campana.dmId === usuario?.id && (
                                    <div className="mis-partidas-acciones-campana">
                                        <button type="button" onClick={() => setPartidaEditando(campana)}>
                                            Editar campaña
                                        </button>
                                        <button type="button" className="mis-partidas-eliminar" onClick={() => setPartidaAEliminar(campana)}>
                                            Eliminar campaña
                                        </button>
                                        <button 
                                            type="button" 
                                            className="fechar-sesiones-trigger" 
                                            onClick={() => window.dispatchEvent(new CustomEvent(`abrir-agendamiento-${campana.id}`))}
                                        >
                                            Fechar sesiones
                                        </button>
                                    </div>
                                )}

                                {campana.viewerIsParticipant && campana.dmId !== usuario?.id && (
                                    <button className="abandonar-partida" type="button" onClick={() => { void desapuntarseDePartida(campana.id).catch(() => undefined); }}>
                                        Salir de la partida
                                    </button>
                                )}
                                
                                <GestionPartida key={campana.id} partida={campana} />
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
            ) : (
                <div className="mis-partidas-vacio">
                    <h2>{usuario ? "Aún no estás en ninguna partida" : "Inicia sesión para ver tus partidas"}</h2>
                    <p>{usuario ? "Busca una campaña abierta y únete para verla aquí." : "La navegación es pública; tus campañas personales requieren una cuenta."}</p>
                    {!usuario && <button type="button" onClick={requestLogin}>Acceder</button>}
                </div>
            )}

            {mostrarCrear && <FormularioPartida onClose={() => setMostrarCrear(false)} />}
            {partidaEditando && <FormularioPartida partidaAEditar={partidaEditando} onClose={() => setPartidaEditando(null)} />}
            {partidaAEliminar && <FormularioPartida partidaAEliminar={partidaAEliminar} onClose={() => setPartidaAEliminar(null)} />}

            <CalendarioSesiones sesiones={sesiones} />
        </section>
    );
}