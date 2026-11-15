import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import AvatarUsuario from "../components/AvatarUsuario";
import PerfilUsuarioLink from "../components/PerfilUsuarioLink";
import { useAmistades } from "./useAmistades";
import "./AmigosPerfil.css";

function enlacePerfil(userId: string) {
  return `${window.location.origin}${window.location.pathname}#/inicio?perfil=${encodeURIComponent(userId)}`;
}

export default function AmigosPerfil({ userId, nombre, esPropio = false }: {
  userId: string;
  nombre: string;
  esPropio?: boolean;
}) {
  const { profile, requestLogin } = useAuth();
  const {
    datos, cargando, error, solicitar, responder, cancelar, eliminar,
  } = useAmistades(userId);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [copiando, setCopiando] = useState(false);
  const autenticado = Boolean(profile?.id);
  const relacion = datos?.relacion;

  async function ejecutarAccion(accion: () => Promise<void | string>) {
    setErrorAccion(null);
    setMensaje(null);
    try {
      await accion();
    } catch (cause) {
      setErrorAccion(cause instanceof Error ? cause.message : "No se pudo completar la acción.");
    }
  }

  async function compartirPerfil() {
    setCopiando(true);
    setErrorAccion(null);
    setMensaje(null);
    try {
      await navigator.clipboard.writeText(enlacePerfil(userId));
      setMensaje("Enlace copiado. Al abrirlo podrán ver el perfil y solicitar amistad.");
    } catch (cause) {
      setErrorAccion(cause instanceof Error ? cause.message : "No se pudo copiar el enlace.");
    } finally {
      setCopiando(false);
    }
  }

  const amigos = datos?.amigos ?? [];
  const recibidas = datos?.solicitudes_recibidas ?? [];
  const enviadas = datos?.solicitudes_enviadas ?? [];

  return (
    <section className="amigos-perfil" aria-labelledby={`amigos-titulo-${userId}`}>
      <header className="amigos-perfil-header">
        <div>
          <h2 id={`amigos-titulo-${userId}`}>{esPropio ? "Mis amigos" : `Amigos de ${nombre}`}</h2>
          <p>{amigos.length} {amigos.length === 1 ? "amistad" : "amistades"}</p>
        </div>
        <button type="button" className="btn-secundario" disabled={copiando} onClick={() => void compartirPerfil()}>
          {copiando ? "Copiando…" : "Compartir perfil"}
        </button>
      </header>

      {cargando && <p role="status">Cargando amistades…</p>}
      {error && <p className="datos-error" role="alert">{error}</p>}
      {errorAccion && <p className="datos-error" role="alert">{errorAccion}</p>}
      {mensaje && <p className="datos-exito" role="status">{mensaje}</p>}

      {!esPropio && profile?.id !== userId && (
        <div className="amigos-perfil-relacion">
          {!autenticado && (
            <button type="button" className="btn-rojo" onClick={requestLogin}>Inicia sesión para solicitar amistad</button>
          )}
          {autenticado && !cargando && datos && !relacion && (
            <button type="button" className="btn-rojo" onClick={() => void ejecutarAccion(() => solicitar(userId))}>
              Solicitar amistad
            </button>
          )}
          {autenticado && relacion?.estado === "pendiente" && relacion.enviada_por_visor && (
            <button type="button" className="btn-secundario" onClick={() => void ejecutarAccion(() => cancelar(relacion.id))}>
              Cancelar solicitud enviada
            </button>
          )}
          {autenticado && relacion?.estado === "pendiente" && !relacion.enviada_por_visor && (
            <>
              <button type="button" className="btn-rojo" onClick={() => void ejecutarAccion(() => responder(relacion.id, true))}>
                Aceptar solicitud
              </button>
              <button type="button" className="btn-secundario" onClick={() => void ejecutarAccion(() => responder(relacion.id, false))}>
                Rechazar
              </button>
            </>
          )}
          {autenticado && relacion?.estado === "aceptada" && (
            <button type="button" className="btn-secundario" onClick={() => void ejecutarAccion(() => eliminar(userId))}>
              Eliminar de mis amigos
            </button>
          )}
        </div>
      )}

      {esPropio && recibidas.length > 0 && (
        <div className="amigos-perfil-solicitudes">
          <h3>Solicitudes recibidas</h3>
          <ul>
            {recibidas.map((solicitud) => (
              <li key={solicitud.id}>
                <AvatarUsuario userId={solicitud.user_id} nombre={solicitud.username} avatarUrl={solicitud.avatar_url} avatarPosition={solicitud.avatar_position} size={38} />
                <PerfilUsuarioLink userId={solicitud.user_id} nombre={solicitud.username} />
                <button type="button" className="btn-rojo" onClick={() => void ejecutarAccion(() => responder(solicitud.id, true))}>Aceptar</button>
                <button type="button" className="btn-secundario" onClick={() => void ejecutarAccion(() => responder(solicitud.id, false))}>Rechazar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {esPropio && enviadas.length > 0 && (
        <div className="amigos-perfil-solicitudes">
          <h3>Solicitudes enviadas</h3>
          <ul>
            {enviadas.map((solicitud) => (
              <li key={solicitud.id}>
                <AvatarUsuario userId={solicitud.user_id} nombre={solicitud.username} avatarUrl={solicitud.avatar_url} avatarPosition={solicitud.avatar_position} size={38} />
                <PerfilUsuarioLink userId={solicitud.user_id} nombre={solicitud.username} />
                <span>Pendiente</span>
                <button type="button" className="btn-secundario" onClick={() => void ejecutarAccion(() => cancelar(solicitud.id))}>Cancelar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {amigos.length === 0 ? (
        <p className="amigos-perfil-vacio">{esPropio ? "Aún no tienes amigos. Comparte tu perfil o solicita amistad desde el perfil de alguien." : "Este perfil aún no tiene amistades."}</p>
      ) : (
        <ul className="amigos-perfil-lista">
          {amigos.map((amigo) => (
            <li key={amigo.user_id}>
              <AvatarUsuario userId={amigo.user_id} nombre={amigo.username} avatarUrl={amigo.avatar_url} avatarPosition={amigo.avatar_position} size={42} />
              <PerfilUsuarioLink userId={amigo.user_id} nombre={amigo.username} />
              {esPropio && (
                <button type="button" className="btn-secundario" onClick={() => void ejecutarAccion(() => eliminar(amigo.user_id))}>
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
