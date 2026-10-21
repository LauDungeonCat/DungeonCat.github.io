import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRolData } from "../useRolData";
import { useAuth } from "../auth/useAuth";
import type { Partida } from "../types";
import GestionPartida from "./GestionPartida";
import AvisoDisponibilidad from "./AvisoDisponibilidad";
import FormularioPartida from "./FormularioPartida";
import VerTriggerWarnings from "./VerTriggerWarnings";
import { hayTriggerWarnings } from "../temasSensibles";
import CalendarioSesiones, { type Sesion } from "./CalendarioSesiones";
import "./MisPartidas.css";

type Vista = "carrusel" | "cuadricula";

const CLAVE_VISTA = "mis-partidas-vista";
const FILAS_MAX_CUADRICULA = 2; // con más filas que estas, la cuadrícula se desliza de lado
const ANCHO_MINIMO_MINI = 150; // debe coincidir con minmax(150px, …) de .campanas-grid en el CSS
const HUECO_CUADRICULA = 16; // 1rem, igual que el gap del CSS
const MAX_INDICADORES = 8; // con más campañas se muestra "3 / 12" en lugar de puntos

function leerVistaGuardada(): Vista {
    try {
        return window.localStorage.getItem(CLAVE_VISTA) === "cuadricula" ? "cuadricula" : "carrusel";
    } catch {
        return "carrusel";
    }
}

function obtenerTextoProximaSesion(partidaId: string, sesiones: Array<{ fecha: string; franja: string; partida_id: string }>): string {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);

    const sesionesPartida = sesiones
        .filter((s) => s.partida_id === partidaId)
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
    const [vista, setVista] = useState<Vista>(leerVistaGuardada);
    const [campanaAbiertaId, setCampanaAbiertaId] = useState<string | null>(null);
    const [columnas, setColumnas] = useState(4);
    const [bordes, setBordes] = useState({ izquierdo: false, derecho: false });
    const cuadriculaRef = useRef<HTMLUListElement>(null);

    const [mostrarCrear, setMostrarCrear] = useState(false);
    const [partidaEditando, setPartidaEditando] = useState<Partida | null>(null);
    const [partidaAEliminar, setPartidaAEliminar] = useState<Partida | null>(null);
    const [partidaConAvisos, setPartidaConAvisos] = useState<Partida | null>(null);

    const misPartidas = partidas.filter((partida) => usuario?.partidasInscritasIds.includes(partida.id) || partida.dmId === usuario?.id);
    const indiceCampanaActiva = misPartidas.length ? campanaActiva % misPartidas.length : 0;
    const campana = misPartidas[indiceCampanaActiva];
    const hayVariasCampanas = misPartidas.length > 1;
    const mostrarCuadricula = vista === "cuadricula" && hayVariasCampanas;
    const cuadriculaDesliza = Math.ceil(misPartidas.length / columnas) > FILAS_MAX_CUADRICULA;
    const campanaAbierta = misPartidas.find((partida) => partida.id === campanaAbiertaId);
    const modalAbierto = Boolean(campanaAbierta);

    const sesiones: Sesion[] = sesionesAgendadas.map((sesion) => {
        // Buscamos la partida asociada utilizando el partida_id de la sesión
        const partidaAsociada = partidas.find((p) => p.id === sesion.partida_id);
        return {
            fecha: new Date(`${sesion.fecha}T12:00:00`),
            titulo: `Sesión · ${sesion.franja === "manana" ? "Mañana" : "Tarde"}`,
            campana: partidaAsociada?.titulo ?? "Campaña",
            hora: sesion.franja === "manana" ? "Mañana" : "Tarde",
            sistema: partidaAsociada?.sistema,
            ubicacion: partidaAsociada?.ubicacionExacta ?? undefined,
        };
    });

    // Indica si hay más campañas a izquierda/derecha para mostrar el degradado en ese lado
    const actualizarBordes = useCallback(() => {
        const nodo = cuadriculaRef.current;
        if (!nodo) return;
        const maximo = nodo.scrollWidth - nodo.clientWidth;
        setBordes({ izquierdo: nodo.scrollLeft > 4, derecho: nodo.scrollLeft < maximo - 4 });
    }, []);

    // Mide cuántas columnas caben para saber si la cuadrícula supera el umbral de filas
    useLayoutEffect(() => {
        const nodo = cuadriculaRef.current;
        if (!nodo) return;
        const medir = () => {
            setColumnas(Math.max(1, Math.floor((nodo.clientWidth + HUECO_CUADRICULA) / (ANCHO_MINIMO_MINI + HUECO_CUADRICULA))));
            actualizarBordes();
        };
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(nodo);
        return () => observador.disconnect();
    }, [mostrarCuadricula, loading, misPartidas.length, actualizarBordes]);

    useEffect(() => {
        actualizarBordes();
    }, [cuadriculaDesliza, mostrarCuadricula, misPartidas.length, actualizarBordes]);

    // Ventana de campaña ampliada: bloquea el scroll de fondo y se cierra con Escape
    useEffect(() => {
        if (!modalAbierto) return;
        const overflowPrevio = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function alPulsarTecla(event: KeyboardEvent) {
            if (event.key !== "Escape") return;
            // Si hay otra ventana abierta encima, Escape es para esa
            if (mostrarCrear || partidaEditando || partidaAEliminar || partidaConAvisos) return;
            setCampanaAbiertaId(null);
        }
        window.addEventListener("keydown", alPulsarTecla);

        return () => {
            document.body.style.overflow = overflowPrevio;
            window.removeEventListener("keydown", alPulsarTecla);
        };
    }, [modalAbierto, mostrarCrear, partidaEditando, partidaAEliminar, partidaConAvisos]);

    function cambiarVista(nueva: Vista) {
        setVista(nueva);
        setCampanaAbiertaId(null);
        try {
            window.localStorage.setItem(CLAVE_VISTA, nueva);
        } catch {
            // sin almacenamiento disponible: la vista solo dura esta sesión
        }
    }

    function moverCarrusel(direccion: number) {
        if (misPartidas.length === 0) return;
        setCampanaActiva((actual) => (actual + direccion + misPartidas.length) % misPartidas.length);
    }

    function desplazarCuadricula(direccion: -1 | 1) {
        const nodo = cuadriculaRef.current;
        if (!nodo) return;
        nodo.scrollBy({ left: direccion * nodo.clientWidth * 0.8, behavior: "smooth" });
    }

    // Tarjeta completa de una campaña: se usa en el carrusel y en la ventana ampliada de la cuadrícula
    function renderTarjeta(item: Partida) {
        return (
            <article className="campana-tarjeta">
                <div className="campana-imagen" role="img" aria-label={`Placeholder de imagen para ${item.titulo}`}>
                    <img src={item.imagenUrl} alt={`Imagen de ${item.titulo}`} />
                </div>
                <div className="campana-contenido">
                    <h2>{item.titulo}</h2>
                    <dl>
                        <div><dt>Sistema:</dt><dd>{item.sistema}</dd></div>
                        <div><dt>Siguiente Sesión:</dt><dd>{obtenerTextoProximaSesion(item.id, sesionesAgendadas)}</dd></div>
                        <div><dt>Sesiones al mes:</dt><dd>{item.sesionesAlMes}</dd></div>
                        {item.duracionEstimada && <div><dt>Duración estimada:</dt><dd>{item.duracionEstimada}</dd></div>}
                        {item.ubicacionExacta && <div><dt>Ubicación:</dt><dd>{item.ubicacionExacta}</dd></div>}
                    </dl>
                    <div className="campana-descripcion">
                        <h3>Descripción:</h3>
                        <p>{item.descripcion}</p>
                    </div>

                    {hayTriggerWarnings(item.triggerWarnings) && (
                        <button type="button" className="tw-boton-ver" onClick={() => setPartidaConAvisos(item)}>
                            Trigger Warnings
                        </button>
                    )}

                    {item.dmId === usuario?.id && (
                        <div className="mis-partidas-acciones-campana">
                            <button type="button" onClick={() => setPartidaEditando(item)}>
                                Editar campaña
                            </button>
                            <button type="button" className="mis-partidas-eliminar" onClick={() => setPartidaAEliminar(item)}>
                                Eliminar campaña
                            </button>
                            <button
                                type="button"
                                className="fechar-sesiones-trigger"
                                onClick={() => window.dispatchEvent(new CustomEvent(`abrir-agendamiento-${item.id}`))}
                            >
                                Fechar sesiones
                            </button>
                        </div>
                    )}

                    {item.viewerIsParticipant && item.dmId !== usuario?.id && (
                        <button className="abandonar-partida" type="button" onClick={() => { void desapuntarseDePartida(item.id).catch(() => undefined); }}>
                            Salir de la partida
                        </button>
                    )}

                    <GestionPartida key={item.id} partida={item} />
                </div>
            </article>
        );
    }

    if (loading) return <section className="mis-partidas" role="status">Cargando tus partidas…</section>;

    return (
        <section className="mis-partidas" aria-labelledby="mis-partidas-titulo">
            <div className="mis-partidas-cabecera">
                <div>
                    <p className="seccion-etiqueta">Partidas</p>
                    <h1 className="page-title">Mis Partidas</h1>
                    <p>Campañas que estás preparando o siguiendo.</p>
                </div>
                <div className="mis-partidas-cabecera-acciones">
                    {usuario && <button className="mis-partidas-crear" type="button" onClick={() => setMostrarCrear(true)}>Crear campaña</button>}
                    <p className="campana-count">{misPartidas.length} {misPartidas.length === 1 ? "partida inscrita" : "partidas inscritas"}</p>
                </div>
            </div>
            {error && <p className="datos-error" role="alert">{error}</p>}
            <AvisoDisponibilidad
                disponibilidad={usuario?.disponibilidad}
                sesiones={sesionesAgendadas.map((s) => ({ ...s, franja: s.franja as "manana" | "tarde" }))}
            />
            {campana ? (
                <div className="campanas-vista">
                    {hayVariasCampanas && (
                        <div className="mis-partidas-barra">
                            <div className="vista-toggle" role="group" aria-label="Vista de campañas">
                                <button type="button" className={vista === "carrusel" ? "activo" : ""} aria-pressed={vista === "carrusel"} onClick={() => cambiarVista("carrusel")}>
                                    Carrusel
                                </button>
                                <button type="button" className={vista === "cuadricula" ? "activo" : ""} aria-pressed={vista === "cuadricula"} onClick={() => cambiarVista("cuadricula")}>
                                    Cuadrícula
                                </button>
                            </div>

                            {mostrarCuadricula && cuadriculaDesliza && (
                                <div className="grid-scroll-controles">
                                    <button
                                        className="carrusel-control anterior"
                                        type="button"
                                        disabled={!bordes.izquierdo}
                                        onClick={() => desplazarCuadricula(-1)}
                                        aria-label="Ver campañas anteriores"
                                    />
                                    <button
                                        className="carrusel-control siguiente"
                                        type="button"
                                        disabled={!bordes.derecho}
                                        onClick={() => desplazarCuadricula(1)}
                                        aria-label="Ver más campañas"
                                    />
                                </div>
                            )}

                            {!mostrarCuadricula && (
                                <div className="campanas-carrusel-nav">
                                    <button
                                        className="carrusel-control anterior"
                                        type="button"
                                        onClick={() => moverCarrusel(-1)}
                                        aria-label="Anterior campaña"
                                    />

                                    {misPartidas.length <= MAX_INDICADORES ? (
                                        <div className="carrusel-indicadores" aria-label="Campaña seleccionada">
                                            {misPartidas.map((campanaItem, indice) => (
                                                <button
                                                    key={campanaItem.id}
                                                    className={indice === indiceCampanaActiva ? "indicador activo" : "indicador"}
                                                    type="button"
                                                    onClick={() => setCampanaActiva(indice)}
                                                    aria-label={`Mostrar ${campanaItem.titulo}`}
                                                    aria-current={indice === indiceCampanaActiva ? "true" : undefined}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="carrusel-contador">{indiceCampanaActiva + 1} / {misPartidas.length}</span>
                                    )}

                                    <button
                                        className="carrusel-control siguiente"
                                        type="button"
                                        onClick={() => moverCarrusel(1)}
                                        aria-label="Siguiente campaña"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {mostrarCuadricula ? (
                        <ul
                            ref={cuadriculaRef}
                            className={`campanas-grid${cuadriculaDesliza ? " desliza" : ""}${bordes.izquierdo ? " borde-izq" : ""}${bordes.derecho ? " borde-der" : ""}`}
                            onScroll={actualizarBordes}
                            aria-label="Mis campañas"
                        >
                            {misPartidas.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className="campana-mini"
                                        onClick={() => setCampanaAbiertaId(item.id)}
                                        aria-label={`Ver ${item.titulo} (${item.sistema})`}
                                    >
                                        <span className="campana-mini-imagen">
                                            <img src={item.imagenUrl} alt="" loading="lazy" />
                                        </span>
                                        <span className="campana-mini-info">
                                            <span className="campana-mini-sistema">{item.sistema}</span>
                                            <span className="campana-mini-titulo">{item.titulo}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="campanas-carrusel-wrapper">
                            <div className="campanas-carrusel" aria-live="polite">
                                {renderTarjeta(campana)}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mis-partidas-vacio">
                    <h2>{usuario ? "Aún no estás en ninguna partida" : "Inicia sesión para ver tus partidas"}</h2>
                    <p>{usuario ? "Busca una campaña abierta y únete para verla aquí." : "La navegación es pública; tus campañas personales requieren una cuenta."}</p>
                    {!usuario && <button type="button" onClick={requestLogin}>Acceder</button>}
                </div>
            )}

            {campanaAbierta && (
                <div className="campana-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCampanaAbiertaId(null); }}>
                    <div className="campana-modal-envoltorio">
                        <button type="button" className="campana-modal-cerrar" onClick={() => setCampanaAbiertaId(null)} aria-label="Cerrar">×</button>
                        <div className="campana-modal-dialog" role="dialog" aria-modal="true" aria-label={campanaAbierta.titulo}>
                            {renderTarjeta(campanaAbierta)}
                        </div>
                    </div>
                </div>
            )}

            {mostrarCrear && <FormularioPartida onClose={() => setMostrarCrear(false)} />}
            {partidaEditando && <FormularioPartida partidaAEditar={partidaEditando} onClose={() => setPartidaEditando(null)} />}
            {partidaAEliminar && <FormularioPartida partidaAEliminar={partidaAEliminar} onClose={() => setPartidaAEliminar(null)} />}
            {partidaConAvisos && <VerTriggerWarnings titulo={partidaConAvisos.titulo} avisos={partidaConAvisos.triggerWarnings} onClose={() => setPartidaConAvisos(null)} />}

            <CalendarioSesiones sesiones={sesiones} />
        </section>
    );
}