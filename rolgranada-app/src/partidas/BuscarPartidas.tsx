import { useEffect, useState, type FormEvent } from "react";
import { useRolData } from "../useRolData";
import { useAuth } from "../auth/useAuth";
import type { Partida } from "../types";
import AvisoDisponibilidad from "./AvisoDisponibilidad";
import "./BuscarPartidas.css";

const IMAGEN_DEFAULT =
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80";

type FormularioPartida = {
  titulo: string;
  sistema: string;
  ubicacionAproximada: string;
  ubicacionExacta: string;
  descripcion: string;
  participantesMax: string;
  sesionesAlMes: string;
  duracionEstimada: string;
  imagenUrl: string;
  esPrivada: boolean;
};

const formularioVacio: FormularioPartida = {
  titulo: "",
  sistema: "",
  ubicacionAproximada: "",
  ubicacionExacta: "",
  descripcion: "",
  participantesMax: "4",
  sesionesAlMes: "2",
  duracionEstimada: "",
  imagenUrl: "",
  esPrivada: false,
};

export default function BuscarPartidas({
  abrirCreacionInicial = false,
  partidaInicialAEditar = null,
}: {
  abrirCreacionInicial?: boolean;
  partidaInicialAEditar?: Partida | null;
}) {
  const {
    usuario,
    partidas,
    sesiones,
    loading,
    error,
    unirseAPartida,
    solicitarUnirseAPartida,
    unirsePorInvitacion,
    desapuntarseDePartida,
    crearPartida,
    actualizarPartida,
    eliminarPartida,
  } = useRolData();
  const { requestLogin } = useAuth();

  const [busqueda, setBusqueda] = useState("");
  const [crearAbierto, setCrearAbierto] = useState(abrirCreacionInicial || partidaInicialAEditar !== null);
  const [formulario, setFormulario] = useState<FormularioPartida>(() => partidaInicialAEditar
    ? {
        titulo: partidaInicialAEditar.titulo,
        sistema: partidaInicialAEditar.sistema,
        ubicacionAproximada: partidaInicialAEditar.ubicacionAproximada,
        ubicacionExacta: partidaInicialAEditar.ubicacionExacta ?? "",
        descripcion: partidaInicialAEditar.descripcion ?? "",
        participantesMax: String(partidaInicialAEditar.participantesMax ?? 4),
        sesionesAlMes: String(partidaInicialAEditar.sesionesAlMes ?? 2),
        duracionEstimada: partidaInicialAEditar.duracionEstimada ?? "",
        imagenUrl: partidaInicialAEditar.imagenUrl ?? "",
        esPrivada: partidaInicialAEditar.esPrivada,
      }
    : formularioVacio);
  const [partidaEnEdicion, setPartidaEnEdicion] = useState<string | null>(partidaInicialAEditar?.id ?? null);
  const [guardando, setGuardando] = useState(false);

  const partidaEnlaceId = new URLSearchParams(window.location.search).get("partida");
  const codigoInvitacion = new URLSearchParams(window.location.search).get("invitacion");
  const termino = busqueda.trim().toLocaleLowerCase("es");

  const partidasFiltradas = partidas.filter((partida) => {
    return `${partida.titulo} ${partida.sistema}`
      .toLocaleLowerCase("es")
      .includes(termino);
  });

  useEffect(() => {
    if (!loading && partidaEnlaceId) {
      document.getElementById(`partida-${partidaEnlaceId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [loading, partidaEnlaceId, partidas]);

  function abrirFormulario(partida?: (typeof partidas)[number]) {
    if (!usuario) {
      requestLogin();
      return;
    }
    setPartidaEnEdicion(partida?.id ?? null);
    setFormulario(
      partida
        ? {
            titulo: partida.titulo,
            sistema: partida.sistema,
            ubicacionAproximada: partida.ubicacionAproximada,
            ubicacionExacta: partida.ubicacionExacta ?? "",
            descripcion: partida.descripcion ?? "",
            participantesMax: String(partida.participantesMax ?? 4),
            sesionesAlMes: String(partida.sesionesAlMes ?? 2),
            duracionEstimada: partida.duracionEstimada ?? "",
            imagenUrl: partida.imagenUrl ?? "",
            esPrivada: partida.esPrivada,
          }
        : formularioVacio,
    );
    setCrearAbierto(true);
  }

  async function enviarCreacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);

    const numSesiones = parseInt(formulario.sesionesAlMes, 10);
    const numParticipantes = parseInt(formulario.participantesMax, 10);

    const datos = {
      titulo: formulario.titulo.trim(),
      sistema: formulario.sistema.trim(),
      ubicacionAproximada: formulario.ubicacionAproximada.trim(),
      ubicacionExacta: formulario.ubicacionExacta.trim() || null,
      imagenUrl: formulario.imagenUrl.trim() || IMAGEN_DEFAULT,
      descripcion: formulario.descripcion.trim(),
      participantesMax: Number.isNaN(numParticipantes) || numParticipantes < 1 ? 4 : numParticipantes,
      sesionesAlMes: Number.isNaN(numSesiones) || numSesiones < 1 ? 2 : numSesiones,
      duracionEstimada: formulario.duracionEstimada.trim(),
      esPrivada: formulario.esPrivada,
    };

    try {
      if (partidaEnEdicion) {
        await actualizarPartida(partidaEnEdicion, datos);
      } else {
        await crearPartida(datos);
      }
      setFormulario(formularioVacio);
      setPartidaEnEdicion(null);
      setCrearAbierto(false);
    } catch {
      return;
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarInscripcion(partidaId: string, yaInscrito: boolean, conInvitacion: boolean, privada: boolean) {
    if (!usuario) {
      requestLogin();
      return;
    }
    try {
      if (yaInscrito) await desapuntarseDePartida(partidaId);
      else if (conInvitacion && codigoInvitacion) await unirsePorInvitacion(partidaId, codigoInvitacion);
      else if (privada) await solicitarUnirseAPartida(partidaId);
      else await unirseAPartida(partidaId);
    } catch {
      return;
    }
  }

  async function borrarPartida(partidaId: string) {
    if (
      !window.confirm(
        "¿Quieres borrar esta campaña? Esta acción no se puede deshacer.",
      )
    )
      return;
    try {
      await eliminarPartida(partidaId);
    } catch {
      return;
    }
  }

  if (loading)
    return (
      <section className="buscar-partidas" role="status">
        Cargando campañas…
      </section>
    );

  return (
    <section
      className="buscar-partidas"
      aria-labelledby="buscar-partidas-titulo"
    >
      <header className="buscar-partidas-cabecera">
        <div>
          <p className="seccion-etiqueta">Partidas</p>
          <h1 className="page-title" id="buscar-partidas-titulo">
            Buscar Partidas
          </h1>
          <p>Explora las campañas y únete a las que sigan abiertas.</p>
          <button
            className="crear-campana-trigger"
            type="button"
            onClick={() => abrirFormulario()}
          >
            Crear campaña
          </button>
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

      {error && (
        <p className="datos-error" role="alert">
          {error}
        </p>
      )}

      <AvisoDisponibilidad disponibilidad={usuario?.disponibilidad} sesiones={sesiones} />

      <p className="buscar-partidas-contador">
        {partidasFiltradas.length}{" "}
        {partidasFiltradas.length === 1 ? "partida" : "partidas"}
      </p>

      {partidasFiltradas.length > 0 ? (
        <div className="partidas-catalogo">
          {partidasFiltradas.map((partida) => {
            const yaInscrito =
              usuario?.partidasInscritasIds.includes(partida.id) ?? false;
            const abierta = partida.estado === "abierta";
            const completa =
              partida.participantesCount >= partida.participantesMax;
            const esDm = usuario?.id === partida.dmId;
            const tieneInvitacion = partida.id === partidaEnlaceId && Boolean(codigoInvitacion);
            const puedeGestionar =
              usuario?.id === partida.dmId || usuario?.role === "admin";
            const sesiones = partida.sesionesAlMes ?? 2;

            return (
              <article
                id={`partida-${partida.id}`}
                className={`partida-catalogo-card${
                  partida.id === partidaEnlaceId ? " partida-destacada" : ""
                }`}
                key={partida.id}
              >
                <div className="partida-catalogo-imagen">
                  <img
                    src={partida.imagenUrl}
                    alt={`Imagen de ${partida.titulo}`}
                    loading="lazy"
                  />
                  <span
                    className={`partida-estado estado-${
                      abierta && completa
                        ? "completa"
                        : partida.estado.replace("_", "-")
                    }`}
                  >
                    {abierta && completa
                      ? "Completa"
                      : etiquetaEstado(partida.estado)}
                  </span>
                </div>
                <div className="partida-catalogo-contenido">
                  <div className="partida-catalogo-titulo">
                    <div>
                      <p className="partida-sistema">{partida.sistema}</p>
                      <h2>{partida.titulo}</h2>
                      {partida.esPrivada && <span className="partida-privada-etiqueta">Privada</span>}
                    </div>
                    <span className="partida-aforo">
                      {partida.participantesCount}/{partida.participantesMax}
                    </span>
                  </div>
                  <p className="partida-dm">
                    <strong>Dirige:</strong> {partida.dm}
                  </p>
                  <p className="partida-sesiones">
                    <strong>Frecuencia:</strong> {sesiones}{" "}
                    {sesiones === 1 ? "sesión" : "sesiones"}/mes
                  </p>
                  {partida.duracionEstimada && (
                    <p className="partida-duracion">
                      <strong>Duración estimada:</strong> {partida.duracionEstimada}
                    </p>
                  )}
                  <p className="partida-ubicacion">
                    <strong>Zona aproximada:</strong>{" "}
                    {partida.ubicacionAproximada}
                  </p>
                  <p className="partida-descripcion">{partida.descripcion}</p>

                  {puedeGestionar && (
                    <div className="partida-gestion">
                      <button
                        type="button"
                        onClick={() => abrirFormulario(partida)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="partida-borrar"
                        onClick={() => {
                          void borrarPartida(partida.id);
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  )}

                  <div className="partida-catalogo-pie">
                    <p>{etiquetaProximaSesion(partida.proximaSesion, partida.proximaSesionFranja)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        void cambiarInscripcion(partida.id, yaInscrito, tieneInvitacion, partida.esPrivada);
                      }}
                      disabled={esDm || (!yaInscrito && (!abierta || completa || (partida.esPrivada && partida.viewerHasRequested && !tieneInvitacion)))}
                      title={
                        completa && !yaInscrito
                          ? "La partida está completa"
                          : undefined
                      }
                    >
                      {esDm
                        ? "Eres DM"
                        : yaInscrito
                          ? "Desapuntarse"
                          : tieneInvitacion
                            ? "Entrar con invitación"
                            : partida.esPrivada && partida.viewerHasRequested
                              ? "Solicitud enviada"
                              : partida.esPrivada
                                ? "Solicitar unirse"
                          : !abierta
                            ? etiquetaEstado(partida.estado)
                            : completa
                              ? "Partida completa"
                              : "Unirse a la partida"}
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

      {crearAbierto && (
        <div
          className="crear-campana-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCrearAbierto(false);
          }}
        >
          <section
            className="crear-campana-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crear-campana-titulo"
          >
            <header className="crear-campana-header">
              <div>
                <p className="seccion-etiqueta">Nueva campaña</p>
                <h2 id="crear-campana-titulo">
                  {partidaEnEdicion ? "Editar campaña" : "Crear campaña"}
                </h2>
              </div>
              <button
                type="button"
                className="crear-campana-cerrar"
                aria-label="Cerrar"
                onClick={() => setCrearAbierto(false)}
              >
                ×
              </button>
            </header>

            <form className="crear-campana-form" onSubmit={enviarCreacion}>
              <div className="crear-campana-grid">
                <label>
                  Título
                  <input
                    required
                    maxLength={80}
                    value={formulario.titulo}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        titulo: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Sistema
                  <input
                    required
                    maxLength={60}
                    value={formulario.sistema}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        sistema: event.target.value,
                      }))
                    }
                    placeholder="Ej. Dungeons & Dragons 5e"
                  />
                </label>
                <p className="crear-campana-dm">
                  DM: <strong>{usuario?.username ?? ""}</strong>
                </p>

                <label className="crear-campana-campo-amplio">
                  URL de imagen de portada <span>(opcional)</span>
                  <input
                    type="url"
                    value={formulario.imagenUrl}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        imagenUrl: event.target.value,
                      }))
                    }
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </label>

                <label className="crear-campana-privacidad crear-campana-campo-amplio">
                  <input
                    type="checkbox"
                    checked={formulario.esPrivada}
                    onChange={(event) =>
                      setFormulario((actual) => ({ ...actual, esPrivada: event.target.checked }))
                    }
                  />
                  Campaña privada: requiere aprobación o enlace de invitación
                </label>

                <label>
                  Ubicación aproximada
                  <input
                    required
                    maxLength={100}
                    value={formulario.ubicacionAproximada}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        ubicacionAproximada: event.target.value,
                      }))
                    }
                    placeholder="Municipio o zona"
                  />
                </label>

                <label className="crear-campana-campo-amplio">
                  Ubicación exacta{" "}
                  <span>
                    (opcional; visible solo para ti, participantes y admins)
                  </span>
                  <textarea
                    rows={2}
                    maxLength={250}
                    value={formulario.ubicacionExacta}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        ubicacionExacta: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Máximo de participantes
                  <input
                    required
                    type="number"
                    min="1"
                    max="20"
                    value={formulario.participantesMax}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        participantesMax: event.target.value,
                      }))
                    }
                    onBlur={() =>
                      setFormulario((actual) => ({
                        ...actual,
                        participantesMax:
                          !actual.participantesMax || parseInt(actual.participantesMax, 10) < 1
                            ? "1"
                            : actual.participantesMax,
                      }))
                    }
                  />
                </label>

                <label>
                  Sesiones al mes
                  <input
                    required
                    type="number"
                    min="1"
                    max="10"
                    value={formulario.sesionesAlMes}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        sesionesAlMes: event.target.value,
                      }))
                    }
                    onBlur={() =>
                      setFormulario((actual) => ({
                        ...actual,
                        sesionesAlMes:
                          !actual.sesionesAlMes || parseInt(actual.sesionesAlMes, 10) < 1
                            ? "1"
                            : actual.sesionesAlMes,
                      }))
                    }
                  />
                </label>

                <label className="crear-campana-campo-amplio">
                  Duración estimada de campaña
                  <input
                    value={formulario.duracionEstimada}
                    maxLength={80}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        duracionEstimada: event.target.value,
                      }))
                    }
                    placeholder="Ej. 6 meses o 12 sesiones"
                  />
                </label>

                <label className="crear-campana-campo-amplio">
                  Descripción
                  <textarea
                    required
                    rows={3}
                    maxLength={500}
                    value={formulario.descripcion}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        descripcion: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <p className="crear-campana-aviso">
                Publica solo una zona general, no la dirección exacta. Si
                quieres compartirla, podrás hacerlo aparte por el canal que
                prefieras.
              </p>

              <div className="crear-campana-acciones">
                <button
                  className="crear-campana-cancelar"
                  type="button"
                  onClick={() => setCrearAbierto(false)}
                >
                  Cancelar
                </button>
                <button
                  className="crear-campana-enviar"
                  type="submit"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando…"
                    : partidaEnEdicion
                      ? "Guardar cambios"
                      : "Publicar campaña"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function etiquetaEstado(estado: "abierta" | "en_curso" | "finalizada") {
  if (estado === "en_curso") return "En curso";
  if (estado === "finalizada") return "Finalizada";
  return "Abierta";
}

function etiquetaProximaSesion(fecha?: string, franja?: "manana" | "tarde") {
  if (!fecha) return "Fecha por decidir";
  const formato = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
  });
  const etiquetaFranja = franja === "manana" ? "por la mañana" : franja === "tarde" ? "por la tarde" : "";
  return `Próxima sesión: ${formato.format(new Date(fecha))}${etiquetaFranja ? `, ${etiquetaFranja}` : ""}`;
}