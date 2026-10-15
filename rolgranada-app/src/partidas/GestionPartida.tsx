import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useRolData } from "../useRolData";
import { supabase } from "../lib/supabase";
import type { JugadorPartidaRow } from "../lib/database.types";
import type { Partida } from "../types";
import ModalPreferenciasUsuario from "./ModalPreferenciasUsuario";
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
    const { profile } = useAuth();
    const { error, actualizarCapacidad, cargarJugadoresPartida, obtenerCodigoInvitacion, echarJugador } = useRolData();

    const [jugadores, setJugadores] = useState<JugadorPartidaRow[]>([]);
    const [jugadoresCargadosId, setJugadoresCargadosId] = useState<string | null>(null);
    const [cargandoRoster, setCargandoRoster] = useState<boolean>(true);
    const [errorRoster, setErrorRoster] = useState<string | null>(null);
    const [capacidad, setCapacidad] = useState<string | null>(null);
    const [errorLocal, setErrorLocal] = useState<string | null>(null);
    const [mensajeEnlace, setMensajeEnlace] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [capacidadAbierta, setCapacidadAbierta] = useState(false);
    const [agendamientoAbierto, setAgendamientoAbierto] = useState(false);
    
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<{ id: string; nombre: string; esMaster: boolean } | null>(null);
    const [perfilesJugadores, setPerfilesJugadores] = useState<Record<string, { avatar_url: string | null; avatar_position: string | null }>>({});
    
    // Estados para el perfil del Master
    const [datosMaster, setDatosMaster] = useState<{ avatar_url: string | null; avatar_position: string | null }>({ avatar_url: partida.dmAvatarUrl ?? null, avatar_position: null });
    const [masterCargado, setMasterCargado] = useState(false);

    const esDm = profile?.id === partida.dmId || profile?.role === "admin";
    const puedeVerRoster = esDm || partida.viewerIsParticipant;

    useEffect(() => {
        const handleAbrir = () => setAgendamientoAbierto(true);
        window.addEventListener(`abrir-agendamiento-${partida.id}`, handleAbrir);
        return () => {
            window.removeEventListener(`abrir-agendamiento-${partida.id}`, handleAbrir);
        };
    }, [partida.id]);

    // Cargar perfil del Master (avatar y posición) de forma síncrona/reactiva limpia
    useEffect(() => {
        let activa = true;
        if (!partida.dmId) return;
        
        setMasterCargado(false);
        setDatosMaster({ avatar_url: partida.dmAvatarUrl ?? null, avatar_position: null });

        async function cargarMaster() {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('avatar_url, avatar_position')
                    .eq('id', partida.dmId)
                    .single();

                if (activa && data) {
                    setDatosMaster({
                        avatar_url: data.avatar_url ?? partida.dmAvatarUrl ?? null,
                        avatar_position: data.avatar_position ?? null
                    });
                }
            } finally {
                if (activa) {
                    setMasterCargado(true);
                }
            }
        }

        void cargarMaster();
        return () => { activa = false; };
    }, [partida.dmId, partida.dmAvatarUrl, partida.id]);

    // Cargar roster de jugadores indicando estado de carga
    useEffect(() => {
        let activa = true;
        if (!puedeVerRoster) return () => { activa = false; };

        setCargandoRoster(true);
        setErrorRoster(null);

        void cargarJugadoresPartida(partida.id)
            .then(async (lista: any[]) => {
                if (!activa) return;

                const listaTipada: JugadorPartidaRow[] = (lista ?? []).map((j) => ({
                    user_id: j.user_id,
                    username: j.username ?? "Usuario",
                    avatar_url: j.avatar_url ?? null,
                    fecha_union: j.fecha_union ?? new Date().toISOString(),
                    dias_indicados: j.dias_indicados ?? 0,
                    franjas_indicadas: j.franjas_indicadas ?? 0,
                    franjas_sin_indicar: j.franjas_sin_indicar ?? 0,
                }));

                setJugadores(listaTipada);
                setErrorRoster(null);
                setJugadoresCargadosId(partida.id);

                if (listaTipada.length > 0) {
                    const ids = listaTipada.map((j) => j.user_id);
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, avatar_url, avatar_position')
                        .in('id', ids);

                    if (activa && profilesData) {
                        const mapa: Record<string, { avatar_url: string | null; avatar_position: string | null }> = {};
                        profilesData.forEach((p: any) => {
                            mapa[p.id] = { 
                                avatar_url: p.avatar_url ?? null, 
                                avatar_position: p.avatar_position ?? null 
                            };
                        });
                        setPerfilesJugadores(mapa);
                    }
                } else {
                    setPerfilesJugadores({});
                }
            })
            .catch((loadError: unknown) => {
                if (activa) {
                    setErrorRoster(mensajeError(loadError, "No se pudo cargar el roster."));
                }
            })
            .finally(() => {
                if (activa) {
                    setCargandoRoster(false);
                }
            });

        return () => {
            activa = false;
        };
    }, [cargarJugadoresPartida, partida.id, puedeVerRoster]);

    useEffect(() => {
        if (!mensajeEnlace) return;
        const timer = setTimeout(() => setMensajeEnlace(""), 3000);
        return () => clearTimeout(timer);
    }, [mensajeEnlace]);

    async function actualizarRoster() {
        setErrorRoster(null);
        setCargandoRoster(true);
        try {
            const lista = await cargarJugadoresPartida(partida.id);
            const listaTipada: JugadorPartidaRow[] = (lista ?? []).map((j: any) => ({
                user_id: j.user_id,
                username: j.username ?? "Usuario",
                avatar_url: j.avatar_url ?? null,
                fecha_union: j.fecha_union ?? new Date().toISOString(),
                dias_indicados: j.dias_indicados ?? 0,
                franjas_indicadas: j.franjas_indicadas ?? 0,
                franjas_sin_indicar: j.franjas_sin_indicar ?? 0,
            }));
            setJugadores(listaTipada);
            setJugadoresCargadosId(partida.id);
        } catch (loadError) {
            setErrorRoster(mensajeError(loadError, "No se pudo cargar el roster."));
            throw loadError;
        } finally {
            setCargandoRoster(false);
        }
    }

    async function guardarCapacidad() {
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

    const masterAvatarPosActualizado = datosMaster.avatar_position ? datosMaster.avatar_position.split(' ') : ['50', '50', '100'];
    const masterTieneFotoActualizado = Boolean(datosMaster.avatar_url && datosMaster.avatar_url.trim() !== '');

    const esPartidaActual = jugadoresCargadosId === partida.id && !cargandoRoster;

    return (
        <section className="gestion-partida" aria-labelledby={`gestion-title-${partida.id}`}>
            {(errorLocal || error) && (
                <p className="datos-error" role="alert">
                    {errorLocal ?? error}
                </p>
            )}

            {/* Tarjeta del Master con transición suave para evitar saltos */}
            <div className="gestion-dm-card">
                <div className="gestion-dm-info">
                    {masterTieneFotoActualizado ? (
                        <div className="gestion-avatar-redondo" style={{ opacity: masterCargado ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }}>
                            <img 
                                src={datosMaster.avatar_url!} 
                                alt="" 
                                referrerPolicy="no-referrer"
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    objectPosition: `${masterAvatarPosActualizado[0]}% ${masterAvatarPosActualizado[1]}%`,
                                    transform: `scale(${Number(masterAvatarPosActualizado[2]) / 100})`,
                                    transformOrigin: `${masterAvatarPosActualizado[0]}% ${masterAvatarPosActualizado[1]}%`
                                }} 
                            />
                        </div>
                    ) : (
                        <div className="gestion-avatar-redondo gestion-avatar-placeholder">DM</div>
                    )}
                    <div>
                        <span className="gestion-rol-titulo">Master</span>
                        <strong>{partida.dm}</strong>
                    </div>
                </div>
                {partida.dmId && (
                    <button
                        type="button"
                        className="btn-ver-preferencias"
                        onClick={() => setUsuarioSeleccionado({ id: partida.dmId, nombre: partida.dm, esMaster: true })}
                    >
                        Ver preferencias
                    </button>
                )}
            </div>

            <div className="gestion-partida-roster">
                {/* Desplegable cerrado por defecto */}
                <details className="gestion-roster-details">
                    <summary className="gestion-partida-roster-header">
                        <h4>
                            Jugadores ({esPartidaActual ? jugadores.length : "…"}/{partida.participantesMax})
                        </h4>
                        <div className="gestion-partida-campos" onClick={(e) => e.stopPropagation()}>
                            {esDm && (
                                <button type="button" className="copiar-invitacion" onClick={() => void copiarEnlace()}>
                                    Copiar enlace de invitación
                                </button>
                            )}
                            {mensajeEnlace && (
                                <span className="gestion-enlace-mensaje" role="status">
                                    {mensajeEnlace}
                                </span>
                            )}
                        </div>
                    </summary>

                    {errorRoster && (
                        <p className="gestion-roster-error" role="alert">
                            {errorRoster}
                        </p>
                    )}

                    {capacidadAbierta && esDm && (
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
                                disabled={guardando || !esPartidaActual}
                                onClick={() => void guardarCapacidad()}
                            >
                                {guardando ? "Guardando…" : "Guardar"}
                            </button>
                        </div>
                    )}

                    {!esPartidaActual ? (
                        <p role="status" style={{ padding: "1rem", fontStyle: "italic", color: "#666" }}>
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
                                "Cargando lista de jugadores…"
                            )}
                        </p>
                    ) : jugadores.length ? (
                        <ul className="gestion-jugadores-ul">
                            {jugadores.map((jugador) => {
                                const perfilJ = perfilesJugadores[jugador.user_id];
                                const avatarPos = perfilJ?.avatar_position ? perfilJ.avatar_position.split(' ') : ['50', '50', '100'];
                                const avatarUrl = perfilJ?.avatar_url;
                                const tieneAvatarValido = Boolean(avatarUrl && avatarUrl.trim() !== '');

                                return <li key={jugador.user_id} className="gestion-jugador-li">
                                    <div className="gestion-jugador-identidad">
                                        {tieneAvatarValido ? (
                                            <div className="gestion-avatar-redondo">
                                                <img
                                                    src={avatarUrl!}
                                                    alt=""
                                                    referrerPolicy="no-referrer"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        display: 'block',
                                                        objectPosition: `${avatarPos[0]}% ${avatarPos[1]}%`,
                                                        transform: `scale(${Number(avatarPos[2]) / 100})`,
                                                        transformOrigin: `${avatarPos[0]}% ${avatarPos[1]}%`
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="gestion-avatar-redondo gestion-avatar-placeholder">User</div>
                                        )}
                                        <div className="gestion-jugador-datos-texto">
                                            <strong>{jugador.username}</strong>
                                        </div>
                                    </div>

                                    <div className="gestion-jugador-acciones-item">
                                        <button
                                            type="button"
                                            className="btn-ver-preferencias"
                                            onClick={() => setUsuarioSeleccionado({ id: jugador.user_id, nombre: jugador.username, esMaster: false })}
                                        >
                                            Preferencias
                                        </button>
                                        {esDm && (
                                            <button
                                                type="button"
                                                className="btn-quitar-jugador"
                                                onClick={() => void quitarJugador(jugador)}
                                                aria-label={`Quitar a ${jugador.username}`}
                                                disabled={guardando}
                                            >
                                                Quitar
                                            </button>
                                        )}
                                    </div>
                                </li>;
                            })}
                        </ul>
                    ) : (
                        <p style={{ padding: "1rem", color: "#666" }}>Aún no hay jugadores inscritos en esta partida.</p>
                    )}
                </details>
            </div>

            {usuarioSeleccionado && (
                <ModalPreferenciasUsuario
                    userId={usuarioSeleccionado.id}
                    esMaster={usuarioSeleccionado.esMaster}
                    onClose={() => setUsuarioSeleccionado(null)}
                />
            )}

            {agendamientoAbierto && (
                <Suspense fallback={<p role="status">Cargando agendamiento…</p>}>
                    <AgendamientoInteligente partida={partida} onClose={() => setAgendamientoAbierto(false)} />
                </Suspense>
            )}
        </section>
    );
}