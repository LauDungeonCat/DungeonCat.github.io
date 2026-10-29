import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useRolData } from "../useRolData";
import { supabase } from "../lib/supabase";
import type { JugadorPartidaRow } from "../lib/database.helpers";
import type { Partida } from "../types";
import ModalPreferenciasUsuario from "./PreferenciasUsuario";
import { FichaParticipanteGestion } from "./FichaParticipanteGestion";
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

    // Estado para alternar el cálculo de disponibilidad (0: Este mes, 1: Mes siguiente)
    const [mesOffset, setMesOffset] = useState<0 | 1>(0);
    
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<{ id: string; nombre: string; esMaster: boolean } | null>(null);
    const [perfilesJugadores, setPerfilesJugadores] = useState<Record<string, { avatar_url: string | null; avatar_position: string | null }>>({});
    
    // Estados para el perfil y disponibilidad del Master
    const [datosMaster, setDatosMaster] = useState<{ avatar_url: string | null; avatar_position: string | null; franjas_indicadas: number; franjas_sin_indicar: number }>({ 
        avatar_url: partida.dmAvatarUrl ?? null, 
        avatar_position: null,
        franjas_indicadas: 0,
        franjas_sin_indicar: 0
    });
    const [masterCargado, setMasterCargado] = useState(false);

    const esDm = profile?.id === partida.dmId || profile?.role === "admin";

    useEffect(() => {
        const handleAbrir = () => setAgendamientoAbierto(true);
        window.addEventListener(`abrir-agendamiento-${partida.id}`, handleAbrir);
        return () => {
            window.removeEventListener(`abrir-agendamiento-${partida.id}`, handleAbrir);
        };
    }, [partida.id]);

    // Cargar perfil y disponibilidad exacta del Master según el mes seleccionado
    useEffect(() => {
        let activa = true;
        if (!partida.dmId) return;
        
        setMasterCargado(false);

        async function cargarMaster() {
            try {
                const [{ data: perfilData }, { data: dispData }] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', partida.dmId).single(),
                    supabase.from('disponibilidades').select('fecha, manana, tarde').eq('user_id', partida.dmId)
                ]);

                if (activa) {
                    const baseDate = new Date();
                    baseDate.setMonth(baseDate.getMonth() + mesOffset);
                    
                    const anio = baseDate.getFullYear();
                    const mes = baseDate.getMonth();
                    const mesStr = `${anio}-${String(mes + 1).padStart(2, "0")}`;
                    
                    const diaInicio = mesOffset === 0 ? baseDate.getDate() : 1;
                    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

                    let franjasConDisponibilidad = 0;
                    let franjasPendientes = 0;

                    const dispMap = new Map<string, { manana?: string; tarde?: string }>();
                    for (const d of (dispData ?? [])) {
                        if (d.fecha.startsWith(`${mesStr}-`)) {
                            dispMap.set(d.fecha, { manana: d.manana ?? "no_indicado", tarde: d.tarde ?? "no_indicado" });
                        }
                    }

                    for (let dia = diaInicio; dia <= diasEnMes; dia += 1) {
                        const fecha = `${mesStr}-${String(dia).padStart(2, "0")}`;
                        const disponibilidadDia = dispMap.get(fecha);
                        
                        for (const franja of ["manana", "tarde"] as const) {
                            const estadoFranja = disponibilidadDia?.[franja];
                            const marcada = estadoFranja && estadoFranja !== "no_indicado";
                            if (marcada) {
                                franjasConDisponibilidad += 1;
                            } else {
                                franjasPendientes += 1;
                            }
                        }
                    }

                    const perfilAny = perfilData as any;
                    setDatosMaster({
                        avatar_url: perfilAny?.avatar_url ?? partida.dmAvatarUrl ?? null,
                        avatar_position: perfilAny?.avatar_position ?? null,
                        franjas_indicadas: franjasConDisponibilidad,
                        franjas_sin_indicar: franjasPendientes
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
    }, [partida.dmId, partida.dmAvatarUrl, partida.id, mesOffset]);

    // Cargar roster de jugadores y calcular su disponibilidad adaptada al mes seleccionado (mesOffset)
    useEffect(() => {
        let activa = true;

        setCargandoRoster(true);
        setErrorRoster(null);

        async function cargarRosterConMes() {
            try {
                const listaBase = await cargarJugadoresPartida(partida.id);
                if (!activa) return;

                if (!listaBase || listaBase.length === 0) {
                    setJugadores([]);
                    setPerfilesJugadores({});
                    setJugadoresCargadosId(partida.id);
                    return;
                }

                const ids = listaBase.map((j) => j.user_id);

                // Calculamos el rango de fechas para el mesOffset (este mes o mes siguiente)
                const baseDate = new Date();
                baseDate.setMonth(baseDate.getMonth() + mesOffset);
                const anio = baseDate.getFullYear();
                const mes = baseDate.getMonth();
                const mesStr = `${anio}-${String(mes + 1).padStart(2, "0")}`;
                const diaInicio = mesOffset === 0 ? baseDate.getDate() : 1;
                const diasEnMes = new Date(anio, mes + 1, 0).getDate();

                // Consultar perfiles y disponibilidades de todos los jugadores de una vez
                const [{ data: profilesData }, { data: dispData }] = await Promise.all([
                    supabase.from('profiles').select('id, avatar_url, avatar_position').in('id', ids),
                    supabase.from('disponibilidades').select('user_id, fecha, manana, tarde').in('user_id', ids)
                ]);

                if (!activa) return;

                // Mapear perfiles
                const mapaPerfiles: Record<string, { avatar_url: string | null; avatar_position: string | null }> = {};
                (profilesData as any[] || []).forEach((p: any) => {
                    mapaPerfiles[p.id] = { 
                        avatar_url: p.avatar_url ?? null, 
                        avatar_position: p.avatar_position ?? null
                    };
                });
                setPerfilesJugadores(mapaPerfiles);

                // Mapear disponibilidades por usuario y fecha
                const dispPorUsuario = new Map<string, Map<string, { manana?: string; tarde?: string }>>();
                for (const d of (dispData ?? [])) {
                    if (d.fecha.startsWith(`${mesStr}-`)) {
                        if (!dispPorUsuario.has(d.user_id)) {
                            dispPorUsuario.set(d.user_id, new Map());
                        }
                        dispPorUsuario.get(d.user_id)?.set(d.fecha, { 
                            manana: d.manana ?? "no_indicado", 
                            tarde: d.tarde ?? "no_indicado" 
                        });
                    }
                }

                // Recalcular franjas indicadas y sin indicar para cada jugador en el mes seleccionado
                const listaProcesada = listaBase.map((jugador) => {
                    let franjasConDisponibilidad = 0;
                    let franjasPendientes = 0;
                    const userDisp = dispPorUsuario.get(jugador.user_id);

                    for (let dia = diaInicio; dia <= diasEnMes; dia += 1) {
                        const fecha = `${mesStr}-${String(dia).padStart(2, "0")}`;
                        const disponibilidadDia = userDisp?.get(fecha);
                        
                        for (const franja of ["manana", "tarde"] as const) {
                            const estadoFranja = disponibilidadDia?.[franja];
                            const marcada = estadoFranja && estadoFranja !== "no_indicado";
                            if (marcada) {
                                franjasConDisponibilidad += 1;
                            } else {
                                franjasPendientes += 1;
                            }
                        }
                    }

                    return {
                        ...jugador,
                        franjas_indicadas: franjasConDisponibilidad,
                        franjas_sin_indicar: franjasPendientes
                    };
                });

                setJugadores(listaProcesada);
                setErrorRoster(null);
                setJugadoresCargadosId(partida.id);
            } catch (loadError) {
                if (activa) {
                    setErrorRoster(mensajeError(loadError, "No se pudo cargar el roster."));
                }
            } finally {
                if (activa) {
                    setCargandoRoster(false);
                }
            }
        }

        void cargarRosterConMes();

        return () => {
            activa = false;
        };
    }, [cargarJugadoresPartida, partida.id, mesOffset]);

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
            setJugadores(lista ?? []);
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

    const esPartidaActual = jugadoresCargadosId === partida.id && !cargandoRoster;

    return (
        <section className="gestion-partida" aria-labelledby={`gestion-title-${partida.id}`}>
            {(errorLocal || error) && (
                <p className="datos-error" role="alert">
                    {errorLocal ?? error}
                </p>
            )}

            {/* Selector de Mes centrado */}
            <div className="gestion-selector-mes-container">
                <span className="gestion-selector-label">Ver Disponibilidad:</span>
                <div className="gestion-selector-botones">
                    <button
                        type="button"
                        className={`btn-mes-opcion ${mesOffset === 0 ? "activo" : ""}`}
                        onClick={() => setMesOffset(0)}
                    >
                        Este Mes
                    </button>
                    <button
                        type="button"
                        className={`btn-mes-opcion ${mesOffset === 1 ? "activo" : ""}`}
                        onClick={() => setMesOffset(1)}
                    >
                        Mes Siguiente
                    </button>
                </div>
            </div>

            {/* Tarjeta del Master unificada */}
            <div className="gestion-dm-card">
                <FichaParticipanteGestion
                    nombre={partida.dm}
                    rol="Master"
                    avatarUrl={datosMaster.avatar_url}
                    avatarPosition={datosMaster.avatar_position}
                    franjasIndicadas={datosMaster.franjas_indicadas}
                    franjasSinIndicar={datosMaster.franjas_sin_indicar}
                    cargado={masterCargado}
                    onVerPreferencias={() => partida.dmId && setUsuarioSeleccionado({ id: partida.dmId, nombre: partida.dm, esMaster: true })}
                />
            </div>

            <div className="gestion-partida-roster">
                <details className="gestion-roster-details" open>
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
                                const avatarUrl = perfilJ?.avatar_url || jugador.avatar_url;
                                const avatarPos = perfilJ?.avatar_position || null;

                                return (
                                    <li key={jugador.user_id}>
                                        <FichaParticipanteGestion
                                            nombre={jugador.username}
                                            rol="Jugador"
                                            avatarUrl={avatarUrl}
                                            avatarPosition={avatarPos}
                                            franjasIndicadas={jugador.franjas_indicadas ?? 0}
                                            franjasSinIndicar={jugador.franjas_sin_indicar ?? 0}
                                            cargado={esPartidaActual}
                                            onVerPreferencias={() => setUsuarioSeleccionado({ id: jugador.user_id, nombre: jugador.username, esMaster: false })}
                                            onQuitar={esDm ? () => void quitarJugador(jugador) : undefined}
                                        />
                                    </li>
                                );
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