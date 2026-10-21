import { useEffect, useState } from "react";
import { useRolData } from "../useRolData";
import { useAuth } from "../auth/useAuth";
import type { Partida } from "../types";
import AvisoDisponibilidad from "./AvisoDisponibilidad";
import FormularioPartida from "./FormularioPartida";
import VerTriggerWarnings from "./VerTriggerWarnings";
import { hayTriggerWarnings } from "../temasSensibles";
import "./BuscarPartidas.css";

export default function BuscarPartidas({
  abrirCreacionInicial = false,
  partidaInicialAEditar = null,
}: {
  abrirCreacionInicial?: boolean;
  partidaInicialAEditar?: Partida | null;
}) {
  const { usuario, partidas, sesiones, loading, error, unirseAPartida, solicitarUnirseAPartida, unirsePorInvitacion, desapuntarseDePartida } = useRolData();
  const { requestLogin } = useAuth();

  const [busqueda, setBusqueda] = useState("");
  const [crearAbierto, setCrearAbierto] = useState(abrirCreacionInicial);
  const [partidaEnEdicion, setPartidaEnEdicion] = useState<Partida | null>(partidaInicialAEditar);
  const [partidaAEliminar, setPartidaAEliminar] = useState<Partida | null>(null);
  const [partidaConAvisos, setPartidaConAvisos] = useState<Partida | null>(null);

  const partidaEnlaceId = new URLSearchParams(window.location.search).get("partida");
  const codigoInvitacion = new URLSearchParams(window.location.search).get("invitacion");
  const termino = busqueda.trim().toLocaleLowerCase("es");

  // Búsqueda mejorada incluyendo título, sistema y zona aproximada
  const partidasFiltradas = partidas.filter((p) => 
    `${p.titulo} ${p.sistema} ${p.ubicacionAproximada}`.toLocaleLowerCase("es").includes(termino)
  );

  // Tipado seguro para las sesiones pasadas al componente AvisoDisponibilidad
  const sesionesTipadas = sesiones.map((s) => ({
    ...s,
    franja: s.franja as "manana" | "tarde",
  }));

  function etiquetaProximaSesion(fecha?: string, franja?: "manana" | "tarde") {
    if (!fecha) return "Fecha por decidir";
    const formato = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" });
    const fechaFormateada = formato.format(new Date(fecha));
    const etiquetaFranja = franja === "manana" ? ", por la mañana" : franja === "tarde" ? ", por la tarde" : "";
    
    return `Próxima sesión: ${fechaFormateada}${etiquetaFranja}`;
  }

  useEffect(() => {
    if (!loading && partidaEnlaceId) {
      document.getElementById(`partida-${partidaEnlaceId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, partidaEnlaceId, partidas]);

  if (loading) return <section className="buscar-partidas" role="status">Cargando campañas…</section>;

  return (
    <section className="buscar-partidas" aria-labelledby="buscar-partidas-titulo">
      <header className="buscar-partidas-cabecera">
        <div>
          <p className="seccion-etiqueta">Partidas</p>
          <h1 className="page-title" id="buscar-partidas-titulo">Buscar Partidas</h1>
          <p>Explora las campañas/aventuras y únete a las que sigan abiertas.</p>
          <button className="crear-campana-trigger" type="button" onClick={() => usuario ? setCrearAbierto(true) : requestLogin()}>
            Crear Partida
          </button>
        </div>
        <label className="buscar-partidas-busqueda">
          <span>Buscar por título, sistema o zona</span>
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. D&D, Zaidín..." />
        </label>
      </header>

      {error && <p className="datos-error" role="alert">{error}</p>}
      <AvisoDisponibilidad disponibilidad={usuario?.disponibilidad} sesiones={sesionesTipadas} />

      <p className="buscar-partidas-contador">{partidasFiltradas.length} {partidasFiltradas.length === 1 ? "partida" : "partidas"}</p>

      {partidasFiltradas.length > 0 ? (
        <div className="partidas-catalogo">
          {partidasFiltradas.map((partida) => {
            const yaInscrito = usuario?.partidasInscritasIds.includes(partida.id) ?? false;
            const abierta = partida.estado === "abierta";
            const completa = partida.participantesCount >= partida.participantesMax;
            const esDm = usuario?.id === partida.dmId;
            const tieneInvitacion = partida.id === partidaEnlaceId && Boolean(codigoInvitacion);
            const puedeGestionar = esDm || usuario?.role === "admin";
            const sesionesMes = partida.sesionesAlMes ?? 2;

            return (
              <article id={`partida-${partida.id}`} className={`partida-catalogo-card${partida.id === partidaEnlaceId ? " partida-destacada" : ""}`} key={partida.id}>
                <div className="partida-catalogo-imagen">
                  <img src={partida.imagenUrl} alt={`Imagen de ${partida.titulo}`} loading="lazy" />
                  <span className={`partida-estado estado-${abierta && completa ? "completa" : partida.estado.replace("_", "-")}`}>
                    {abierta && completa ? "Completa" : etiquetaEstado(partida.estado)}
                  </span>
                </div>
                <div className="partida-catalogo-contenido">
                  <div className="partida-catalogo-titulo">
                    <div>
                      <p className="partida-sistema">{partida.sistema}</p>
                      <h2>{partida.titulo}</h2>
                      {partida.esPrivada && <span className="partida-privada-etiqueta">Privada</span>}
                    </div>
                    <span className="partida-aforo">{partida.participantesCount}/{partida.participantesMax}</span>
                  </div>
                  <p className="partida-dm"><strong>Dirige:</strong> {partida.dm}</p>
                  <p className="partida-sesiones"><strong>Frecuencia:</strong> {sesionesMes} {sesionesMes === 1 ? "sesión" : "sesiones"}/mes</p>
                  {partida.duracionEstimada && <p className="partida-duracion"><strong>Duración estimada:</strong> {partida.duracionEstimada}</p>}
                  <p className="partida-ubicacion"><strong>Zona aproximada:</strong> {partida.ubicacionAproximada}</p>
                  <p className="partida-descripcion">{partida.descripcion}</p>

                  {hayTriggerWarnings(partida.triggerWarnings) && (
                    <button type="button" className="tw-boton-ver" onClick={() => setPartidaConAvisos(partida)}>
                      Trigger Warnings
                    </button>
                  )}

                  {puedeGestionar && (
                    <div className="partida-gestion">
                      <button type="button" onClick={() => setPartidaEnEdicion(partida)}>Editar</button>
                      <button type="button" className="partida-borrar" onClick={() => setPartidaAEliminar(partida)}>Borrar</button>
                    </div>
                  )}

                  <div className="partida-catalogo-pie">
                    <p>{etiquetaProximaSesion(partida.proximaSesion, partida.proximaSesionFranja)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!usuario) { requestLogin(); return; }
                        void (yaInscrito ? desapuntarseDePartida(partida.id) : tieneInvitacion && codigoInvitacion ? unirsePorInvitacion(partida.id, codigoInvitacion) : partida.esPrivada ? solicitarUnirseAPartida(partida.id) : unirseAPartida(partida.id));
                      }}
                      disabled={esDm || (!yaInscrito && (!abierta || completa || (partida.esPrivada && partida.viewerHasRequested && !tieneInvitacion)))}
                    >
                      {esDm ? "Eres DM" : yaInscrito ? "Desapuntarse" : tieneInvitacion ? "Entrar con invitación" : partida.esPrivada && partida.viewerHasRequested ? "Solicitud enviada" : partida.esPrivada ? "Solicitar unirse" : !abierta ? etiquetaEstado(partida.estado) : completa ? "Partida completa" : "Unirse a la campaña"}
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
          <p>Prueba otro título, sistema o zona de juego.</p>
        </div>
      )}

      {crearAbierto && <FormularioPartida onClose={() => setCrearAbierto(false)} />}
      {partidaEnEdicion && <FormularioPartida partidaAEditar={partidaEnEdicion} onClose={() => setPartidaEnEdicion(null)} />}
      {partidaAEliminar && <FormularioPartida partidaAEliminar={partidaAEliminar} onClose={() => setPartidaAEliminar(null)} />}
      {partidaConAvisos && <VerTriggerWarnings titulo={partidaConAvisos.titulo} avisos={partidaConAvisos.triggerWarnings} onClose={() => setPartidaConAvisos(null)} />}
    </section>
  );
}

function etiquetaEstado(estado: "abierta" | "en_curso" | "finalizada") {
  if (estado === "en_curso") return "En curso";
  if (estado === "finalizada") return "Finalizada";
  return "Abierta";
}