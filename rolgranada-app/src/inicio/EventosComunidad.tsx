import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { featureRpc } from "../lib/featureRpc";
import { supabase } from "../lib/supabase";
import type { EventoComunidad, Partida } from "../types";
import PerfilUsuarioLink from "../components/PerfilUsuarioLink";
import "../partidas/FormularioPartida.css";

interface EventosComunidadProps {
  partidas: Partida[];
}

type FormularioEvento = {
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  ubicacion: string;
  modalidad: "abierto" | "cerrado";
  mesasMax: string;
  sinLimite: boolean;
  partidasIds: string[];
};

const formularioVacio: FormularioEvento = {
  titulo: "",
  descripcion: "",
  imagenUrl: "",
  fecha: "",
  horaInicio: "",
  horaFin: "",
  ubicacion: "",
  modalidad: "abierto",
  mesasMax: "4",
  sinLimite: false,
  partidasIds: [],
};

function fechaLocalIso() {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00`));
}

function enlaceGoogleCalendar(evento: EventoComunidad) {
  const fecha = evento.fecha.replaceAll("-", "");
  const horaInicio = evento.hora_inicio.replaceAll(":", "").slice(0, 6);
  const horaFin = evento.hora_fin.replaceAll(":", "").slice(0, 6);
  const parametros = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    dates: `${fecha}T${horaInicio}/${fecha}T${horaFin}`,
    ctz: "Europe/Madrid",
    details: evento.descripcion,
    location: evento.ubicacion,
  });
  return `https://calendar.google.com/calendar/render?${parametros.toString()}`;
}

function mensajeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return "No se pudo completar la operación.";
}

export default function EventosComunidad({ partidas }: EventosComunidadProps) {
  const { profile, requestLogin } = useAuth();
  const [eventos, setEventos] = useState<EventoComunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorOperacion, setErrorOperacion] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [eventoEnGuardado, setEventoEnGuardado] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoMesasId, setEventoMesasId] = useState<string | null>(null);
  const [eventoEnEdicion, setEventoEnEdicion] = useState<EventoComunidad | null>(null);
  const [formulario, setFormulario] = useState<FormularioEvento>(formularioVacio);
  const [partidaSeleccionada, setPartidaSeleccionada] = useState<Record<string, string>>({});
  const esAdmin = profile?.role === "admin";
  const cerrarMesas = useCallback(() => setEventoMesasId(null), []);

  const cargarEventos = useCallback(async () => {
    const data = await featureRpc("listar_eventos_comunidad", {});
    setEventos(data);
    setError(null);
  }, []);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        await cargarEventos();
      } catch (loadError: unknown) {
        if (activo) setError(mensajeError(loadError));
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargar();
    const canal = supabase
      .channel("eventos_comunidad_inicio")
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos_comunidad" }, () => {
        if (activo) void cargarEventos().catch((loadError: unknown) => setError(mensajeError(loadError)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sesiones" }, () => {
        if (activo) void cargarEventos().catch((loadError: unknown) => setError(mensajeError(loadError)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "partida_participantes" }, () => {
        if (activo) void cargarEventos().catch((loadError: unknown) => setError(mensajeError(loadError)));
      })
      .subscribe((status, subscriptionError) => {
        if (activo && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
          setError(subscriptionError?.message ?? `La conexión de eventos no está disponible (${status}).`);
        }
      });

    return () => {
      activo = false;
      void supabase.removeChannel(canal);
    };
  }, [cargarEventos]);

  useEffect(() => {
    if (!eventoMesasId) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cerrarMesas();
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [cerrarMesas, eventoMesasId]);

  const partidasActivas = useMemo(() => partidas.filter((partida) => partida.estado !== "finalizada"), [partidas]);
  const partidasPropias = useMemo(
    () => partidasActivas.filter((partida) => partida.dmId === profile?.id),
    [partidasActivas, profile?.id],
  );
  const eventoConMesasAbierto = eventos.find((evento) => evento.id === eventoMesasId) ?? null;
  const opcionesModalMesas = useMemo(() => {
    if (!eventoConMesasAbierto) return [];
    const idsIncluidos = new Set(eventoConMesasAbierto.partidas.map((partida) => partida.partida_id));
    const candidatas = eventoConMesasAbierto.modalidad === "cerrado"
      ? esAdmin ? partidasActivas : []
      : partidasPropias;
    return candidatas.filter((partida) => !idsIncluidos.has(partida.id));
  }, [esAdmin, eventoConMesasAbierto, partidasActivas, partidasPropias]);

  function abrirCreacion() {
    setEventoEnEdicion(null);
    setFormulario(formularioVacio);
    setErrorOperacion(null);
    setModalAbierto(true);
  }

  function abrirGestion(evento: EventoComunidad) {
    setEventoEnEdicion(evento);
    setFormulario({
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      imagenUrl: evento.imagen_url ?? "",
      fecha: evento.fecha,
      horaInicio: evento.hora_inicio.slice(0, 5),
      horaFin: evento.hora_fin.slice(0, 5),
      ubicacion: evento.ubicacion,
      modalidad: evento.modalidad,
      mesasMax: String(evento.mesas_max ?? 4),
      sinLimite: evento.mesas_max === null,
      partidasIds: [],
    });
    setErrorOperacion(null);
    setModalAbierto(true);
  }
  function actualizarFormulario(campo: keyof FormularioEvento, valor: string | boolean | string[]) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarEvento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!esAdmin) return;
    setCreando(true);
    setErrorOperacion(null);
    try {
      const datosEvento = {
        p_titulo: formulario.titulo.trim(),
        p_descripcion: formulario.descripcion.trim(),
        p_imagen_url: formulario.imagenUrl.trim() || null,
        p_fecha: formulario.fecha,
        p_hora_inicio: formulario.horaInicio,
        p_hora_fin: formulario.horaFin,
        p_ubicacion: formulario.ubicacion.trim(),
        p_modalidad: formulario.modalidad,
        p_mesas_max: formulario.sinLimite ? null : Number(formulario.mesasMax),
      };
      if (eventoEnEdicion) {
        await featureRpc("actualizar_evento_comunidad", {
          p_evento_id: eventoEnEdicion.id,
          ...datosEvento,
        });
      } else {
        await featureRpc("crear_evento_comunidad", {
          ...datosEvento,
          p_partida_ids: formulario.modalidad === "cerrado" ? formulario.partidasIds : [],
        });
      }
      setEventoEnEdicion(null);
      setFormulario(formularioVacio);
      setModalAbierto(false);
      await cargarEventos();
    } catch (operationError: unknown) {
      setErrorOperacion(mensajeError(operationError));
    } finally {
      setCreando(false);
    }
  }

  async function agregarPartida(evento: EventoComunidad) {
    const partidaId = partidaSeleccionada[evento.id];
    if (!partidaId) return;
    setEventoEnGuardado(evento.id);
    setErrorOperacion(null);
    try {
      await featureRpc("agregar_partida_evento", { p_evento_id: evento.id, p_partida_id: partidaId });
      setPartidaSeleccionada((actual) => ({ ...actual, [evento.id]: "" }));
      await cargarEventos();
    } catch (operationError: unknown) {
      setErrorOperacion(mensajeError(operationError));
    } finally {
      setEventoEnGuardado(null);
    }
  }

  async function quitarPartida(evento: EventoComunidad, partidaId: string) {
    setEventoEnGuardado(evento.id);
    setErrorOperacion(null);
    try {
      await featureRpc("quitar_partida_evento", { p_evento_id: evento.id, p_partida_id: partidaId });
      await cargarEventos();
    } catch (operationError: unknown) {
      setErrorOperacion(mensajeError(operationError));
    } finally {
      setEventoEnGuardado(null);
    }
  }

  async function eliminarEvento(evento: EventoComunidad) {
    if (!window.confirm(`¿Eliminar el evento «${evento.titulo}» y sus sesiones asociadas?`)) return;
    setEventoEnGuardado(evento.id);
    setErrorOperacion(null);
    try {
      await featureRpc("eliminar_evento_comunidad", { p_evento_id: evento.id });
      setEventoEnEdicion(null);
      setModalAbierto(false);
      await cargarEventos();
    } catch (operationError: unknown) {
      setErrorOperacion(mensajeError(operationError));
    } finally {
      setEventoEnGuardado(null);
    }
  }

  function cerrarModal() {
    if (creando) return;
    setModalAbierto(false);
    setEventoEnEdicion(null);
    setErrorOperacion(null);
  }

  async function reservarSitio(sesionId: string) {
    if (!profile) {
      requestLogin();
      return;
    }
    setEventoEnGuardado(sesionId);
    setErrorOperacion(null);
    try {
      await featureRpc("unirse_partida_evento", { p_sesion_id: sesionId });
      await cargarEventos();
    } catch (operationError: unknown) {
      setErrorOperacion(mensajeError(operationError));
    } finally {
      setEventoEnGuardado(null);
    }
  }

  return (
    <section className="inicio-eventos" aria-labelledby="inicio-eventos-titulo">
      <div className="inicio-eventos-cabecera">
        <div>
          <h2 className="inicio-seccion-titulo" id="inicio-eventos-titulo">Próximos eventos</h2>
        </div>
        {esAdmin && (
          <button type="button" className="btn-rojo" onClick={abrirCreacion}>
            Crear evento
          </button>
        )}
      </div>

      {error && <p className="datos-error" role="alert">{error}</p>}
      {errorOperacion && !modalAbierto && <p className="datos-error" role="alert">{errorOperacion}</p>}
      {cargando ? <p role="status">Cargando eventos…</p> : eventos.length === 0 ? (
        <p className="inicio-eventos-vacio">
          {esAdmin ? "Todavía no hay eventos. Puedes crear uno para organizar una jornada de partidas." : "Todavía no hay eventos próximos."}
        </p>
      ) : (
        <div className="inicio-eventos-grid">
          {eventos.map((evento) => {
            const aforoMesasCompleto = evento.mesas_max !== null && evento.mesas_actuales >= evento.mesas_max;

            return (
              <article className={`inicio-evento-card${evento.imagen_url ? "" : " sin-imagen"}`} key={evento.id}>
                <div className="inicio-evento-contenido">
                  <div className="inicio-evento-etiquetas">
                    <span className={`inicio-evento-modo ${evento.modalidad}`}>{evento.modalidad === "abierto" ? "Evento abierto" : "Evento cerrado"}</span>
                    <span>{evento.mesas_max === null ? `${evento.mesas_actuales} mesas · sin límite` : `${evento.mesas_actuales}/${evento.mesas_max} mesas`}</span>
                  </div>
                  <h3>{evento.titulo}</h3>
                  {evento.descripcion && <p className="inicio-evento-descripcion">{evento.descripcion}</p>}
                  <dl className="inicio-evento-detalles">
                    <div><dt>Fecha común</dt><dd>{formatearFecha(evento.fecha)}</dd></div>
                    <div><dt>Horario</dt><dd>{evento.hora_inicio.slice(0, 5)}–{evento.hora_fin.slice(0, 5)}</dd></div>
                    <div><dt>Ubicación</dt><dd>{evento.ubicacion}</dd></div>
                  </dl>
                </div>
                {evento.imagen_url && (
                  <img className="inicio-evento-imagen" src={evento.imagen_url} alt="" loading="lazy" />
                )}
                <div className="inicio-evento-acciones">
                  <button
                    className="btn-rojo inicio-evento-ver-mesas"
                    type="button"
                    onClick={() => setEventoMesasId(evento.id)}
                  >
                    Ver mesas del evento ({evento.partidas.length})
                  </button>
                  <a className="btn-secundario inicio-evento-calendario" href={enlaceGoogleCalendar(evento)} target="_blank" rel="noreferrer">
                    Añadir a Google Calendar
                  </a>
                  {esAdmin && (
                    <button className="btn-secundario inicio-evento-gestionar" type="button" onClick={() => abrirGestion(evento)}>
                      Gestionar
                    </button>
                  )}
                  {aforoMesasCompleto && <p className="inicio-evento-aforo">Se ha alcanzado el límite de mesas.</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {eventoConMesasAbierto && (
        <div className="inicio-evento-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && cerrarMesas()}>
          <section className="inicio-evento-modal" role="dialog" aria-modal="true" aria-labelledby="inicio-evento-mesas-titulo">
            <header className="inicio-evento-modal-header">
              <div>
                <p className="seccion-etiqueta">Mesas del evento</p>
                <h2 id="inicio-evento-mesas-titulo">{eventoConMesasAbierto.titulo}</h2>
              </div>
              <button type="button" className="crear-campana-cerrar" onClick={cerrarMesas} aria-label="Cerrar mesas del evento">×</button>
            </header>

            {eventoConMesasAbierto.partidas.length === 0 ? (
              <p className="inicio-eventos-vacio">Aún no hay mesas asignadas a este evento.</p>
            ) : (
              <ul className="inicio-evento-modal-mesas">
                {eventoConMesasAbierto.partidas.map((partida) => {
                  const estado = partida.estado ?? "abierta";
                  const plazasOcupadas = partida.participantes_count;
                  const plazasMaximas = partida.participantes_max;
                  const aforoConocido = typeof plazasOcupadas === "number" && typeof plazasMaximas === "number";
                  const mesaCompleta = aforoConocido && plazasOcupadas >= plazasMaximas;
                  const yaReservado = partida.viewer_is_participant ?? false;

                  return (
                    <li className="inicio-evento-modal-mesa" key={partida.sesion_id}>
                      {partida.imagen_url ? (
                        <img src={partida.imagen_url} alt="" loading="lazy" />
                      ) : (
                        <div className="inicio-evento-mesa-sin-imagen" aria-hidden="true">Sin imagen</div>
                      )}
                      <div className="inicio-evento-modal-mesa-info">
                        <div className="inicio-evento-mesa-etiquetas">
                          <span className="inicio-evento-sistema">{partida.sistema}</span>
                          {estado !== "abierta" && <span className="inicio-evento-estado-mesa">{estado.replaceAll("_", " ")}</span>}
                        </div>
                        <h3>{partida.titulo}</h3>
                        <p className="inicio-evento-dm">
                          Dirige:{" "}
                          {partida.dm_id ? (
                            <PerfilUsuarioLink userId={partida.dm_id} nombre={partida.dm_username} />
                          ) : partida.dm_username}
                        </p>
                        {aforoConocido && <p className="inicio-evento-resumen-aforo">Sitios reservados: {plazasOcupadas}/{plazasMaximas}</p>}
                      </div>
                      <div className="inicio-evento-mesa-acciones">
                        {profile && estado === "abierta" && partida.dm_id !== profile.id && (
                          <button
                            className="btn-secundario inicio-evento-reservar"
                            type="button"
                            onClick={() => void reservarSitio(partida.sesion_id)}
                            disabled={yaReservado || mesaCompleta || eventoEnGuardado === partida.sesion_id}
                          >
                            {eventoEnGuardado === partida.sesion_id ? "Reservando…" : yaReservado ? "Sitio reservado" : mesaCompleta ? "Mesa completa" : "Reservar sitio"}
                          </button>
                        )}
                        {!profile && estado === "abierta" && (
                          <button className="btn-secundario inicio-evento-reservar" type="button" onClick={requestLogin}>
                            Reservar sitio
                          </button>
                        )}
                        {(esAdmin || (eventoConMesasAbierto.modalidad === "abierto" && partida.es_mia)) && (
                          <button
                            className="inicio-evento-quitar"
                            type="button"
                            onClick={() => void quitarPartida(eventoConMesasAbierto, partida.partida_id)}
                            disabled={eventoEnGuardado === eventoConMesasAbierto.id}
                            aria-label={`Quitar ${partida.titulo} del evento`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {errorOperacion && <p className="datos-error" role="alert">{errorOperacion}</p>}
            {profile && eventoConMesasAbierto.fecha >= fechaLocalIso()
              && (eventoConMesasAbierto.modalidad === "abierto" || esAdmin)
              && !(eventoConMesasAbierto.mesas_max !== null
                && eventoConMesasAbierto.mesas_actuales >= eventoConMesasAbierto.mesas_max) && (
                <div className="inicio-evento-anadir">
                  <label>
                    <span>{eventoConMesasAbierto.modalidad === "abierto" ? "Añade una partida que diriges" : "Añadir partida al evento"}</span>
                    <select
                      value={partidaSeleccionada[eventoConMesasAbierto.id] ?? ""}
                      onChange={(event) => setPartidaSeleccionada((actual) => ({ ...actual, [eventoConMesasAbierto.id]: event.target.value }))}
                    >
                      <option value="">Selecciona una partida…</option>
                      {opcionesModalMesas
                        .map((partida) => <option value={partida.id} key={partida.id}>{partida.titulo} · {partida.sistema}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => void agregarPartida(eventoConMesasAbierto)}
                    disabled={!partidaSeleccionada[eventoConMesasAbierto.id] || eventoEnGuardado === eventoConMesasAbierto.id}
                  >
                    {eventoEnGuardado === eventoConMesasAbierto.id ? "Guardando…" : "Añadir mesa"}
                  </button>
                </div>
              )}
            {eventoConMesasAbierto.modalidad === "abierto" && !profile && (
              <button className="btn-secundario" type="button" onClick={requestLogin}>Accede para añadir tu partida</button>
            )}
          </section>
        </div>
      )}

      {modalAbierto && (
        <div className="crear-campana-overlay" onMouseDown={(event) => event.target === event.currentTarget && cerrarModal()}>
          <section className="crear-campana-dialog" role="dialog" aria-modal="true" aria-labelledby="crear-evento-titulo">
            <header className="crear-campana-header">
              <div>
                <h2 id="crear-evento-titulo">{eventoEnEdicion ? "Gestionar evento" : "Crear evento"}</h2>
              </div>
              <button type="button" className="crear-campana-cerrar" onClick={cerrarModal} disabled={creando} aria-label="Cerrar">×</button>
            </header>
            {errorOperacion && <p className="datos-error" role="alert">{errorOperacion}</p>}
            <form className="crear-campana-form inicio-evento-form" onSubmit={(event) => void guardarEvento(event)}>
              <label>
                Nombre del evento
                <input required minLength={3} maxLength={100} value={formulario.titulo} onChange={(event) => actualizarFormulario("titulo", event.target.value)} />
              </label>
              <label>
                Descripción
                <textarea maxLength={2000} rows={3} value={formulario.descripcion} onChange={(event) => actualizarFormulario("descripcion", event.target.value)} />
              </label>
              <label>
                Imagen (URL opcional)
                <input type="url" maxLength={500} value={formulario.imagenUrl} onChange={(event) => actualizarFormulario("imagenUrl", event.target.value)} placeholder="https://…" />
              </label>
              <label>
                Ubicación del evento
                <input required maxLength={250} value={formulario.ubicacion} onChange={(event) => actualizarFormulario("ubicacion", event.target.value)} placeholder="Dirección o punto de encuentro" />
              </label>
              <div className="inicio-evento-form-fila">
                <label>Fecha común<input required type="date" min={fechaLocalIso()} value={formulario.fecha} onChange={(event) => actualizarFormulario("fecha", event.target.value)} /></label>
                <label>Inicio<input required type="time" value={formulario.horaInicio} onChange={(event) => actualizarFormulario("horaInicio", event.target.value)} /></label>
                <label>Fin<input required type="time" value={formulario.horaFin} onChange={(event) => actualizarFormulario("horaFin", event.target.value)} /></label>
              </div>
              <fieldset className="inicio-evento-modalidad">
                <legend>Tipo de evento</legend>
                <label>
                  <input type="radio" name="modalidad-evento" checked={formulario.modalidad === "abierto"} onChange={() => actualizarFormulario("modalidad", "abierto")} />
                  <span><strong>Abierto</strong> · cada DM puede añadir una partida propia. Recomendado para partidas abiertas a principiantes.</span>
                </label>
                <label>
                  <input type="radio" name="modalidad-evento" checked={formulario.modalidad === "cerrado"} onChange={() => actualizarFormulario("modalidad", "cerrado")} />
                  <span><strong>Cerrado</strong> · solo los administradores seleccionan y gestionan las partidas.</span>
                </label>
              </fieldset>
              <label className="inicio-evento-sin-limite">
                <input type="checkbox" checked={formulario.sinLimite} onChange={(event) => actualizarFormulario("sinLimite", event.target.checked)} />
                Sin límite de mesas (por ejemplo, eventos en parques)
              </label>
              {!formulario.sinLimite && (
                <label>
                  Máximo de mesas
                  <input required type="number" min={1} max={100} value={formulario.mesasMax} onChange={(event) => actualizarFormulario("mesasMax", event.target.value)} />
                </label>
              )}
              {formulario.modalidad === "cerrado" && (
                <fieldset className="inicio-evento-partidas-seleccion">
                  <legend>Partidas incluidas</legend>
                  {partidasActivas.length === 0 ? <p>No hay partidas activas para seleccionar.</p> : partidasActivas.map((partida) => (
                    <label key={partida.id}>
                      <input
                        type="checkbox"
                        checked={formulario.partidasIds.includes(partida.id)}
                        onChange={(event) => actualizarFormulario(
                          "partidasIds",
                          event.target.checked
                            ? [...formulario.partidasIds, partida.id]
                            : formulario.partidasIds.filter((id) => id !== partida.id),
                        )}
                      />
                      <span>{partida.titulo} · {partida.sistema} · {partida.dm}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <p className="inicio-evento-nota">
                Todas las partidas del evento compartirán esta fecha y este horario exactos. Al añadir una partida se creará su sesión automáticamente, sin tener en cuenta la disponibilidad.
              </p>
              <div className="crear-campana-acciones">
                {eventoEnEdicion && (
                  <button
                    className="crear-campana-cancelar inicio-evento-borrar"
                    type="button"
                    onClick={() => void eliminarEvento(eventoEnEdicion)}
                    disabled={creando || eventoEnGuardado === eventoEnEdicion.id}
                  >
                    {eventoEnGuardado === eventoEnEdicion.id ? "Eliminando…" : "Eliminar evento"}
                  </button>
                )}
                <button className="crear-campana-cancelar" type="button" onClick={cerrarModal} disabled={creando}>Cancelar</button>
                <button className="crear-campana-enviar" type="submit" disabled={creando}>{creando ? "Guardando…" : eventoEnEdicion ? "Guardar cambios" : "Crear evento"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
