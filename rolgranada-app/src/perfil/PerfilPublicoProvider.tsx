import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/useAuth";
import AvatarUsuario from "../components/AvatarUsuario";
import PerfilUsuarioLink from "../components/PerfilUsuarioLink";
import { featureRpc } from "../lib/featureRpc";
import type { CompaneroFrecuente } from "../types";
import { PerfilPublicoContext } from "./contextoPerfilPublico";
import InsigniasUsuario from "./InsigniasUsuario";
import AmigosPerfil from "./AmigosPerfil";
import { useEstadisticasUsuario } from "./useEstadisticasUsuario";
import "./PerfilPublico.css";

export function PerfilPublicoProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const abrirPerfil = useCallback((id: string) => setUserId(id), []);
  const cerrarPerfil = useCallback(() => {
    const [ruta, query] = window.location.hash.slice(1).split("?");
    if (query) {
      const parametros = new URLSearchParams(query);
      parametros.delete("perfil");
      const hash = `#${ruta}${[...parametros].length > 0 ? `?${parametros.toString()}` : ""}`;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    }
    setUserId(null);
  }, []);

  useEffect(() => {
    const abrirPerfilCompartido = () => {
      const query = window.location.hash.split("?")[1];
      const idCompartido = query ? new URLSearchParams(query).get("perfil") : null;
      setUserId(idCompartido);
    };
    abrirPerfilCompartido();
    window.addEventListener("hashchange", abrirPerfilCompartido);
    return () => window.removeEventListener("hashchange", abrirPerfilCompartido);
  }, []);

  return (
    <PerfilPublicoContext.Provider value={abrirPerfil}>
      {children}
      {userId && (
        <PerfilPublicoDialog
          key={userId}
          userId={userId}
          refreshKey={refreshKey}
          onClose={cerrarPerfil}
          onRefresh={() => setRefreshKey((current) => current + 1)}
        />
      )}
    </PerfilPublicoContext.Provider>
  );
}

function PerfilPublicoDialog({ userId, refreshKey, onClose, onRefresh }: {
  userId: string;
  refreshKey: number;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { profile } = useAuth();
  const { estadisticas, cargando, error } = useEstadisticasUsuario(userId, refreshKey);
  const [errorAdmin, setErrorAdmin] = useState<string | null>(null);
  const [guardandoAdmin, setGuardandoAdmin] = useState(false);
  const esAdmin = profile?.role === "admin";

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [onClose]);

  async function cambiarApoyo(apoyado: boolean) {
    setGuardandoAdmin(true);
    setErrorAdmin(null);
    try {
      await featureRpc("marcar_apoyo_kofi", { p_user_id: userId, p_apoyado: apoyado });
      onRefresh();
    } catch (cause) {
      setErrorAdmin(cause instanceof Error ? cause.message : "No se pudo actualizar la insignia.");
    } finally {
      setGuardandoAdmin(false);
    }
  }

  return (
    <div className="perfil-publico-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="perfil-publico-dialog" role="dialog" aria-modal="true" aria-labelledby="perfil-publico-titulo">
        <button className="perfil-publico-cerrar" type="button" onClick={onClose} aria-label="Cerrar perfil">×</button>
        {cargando && <p role="status">Cargando perfil…</p>}
        {error && <p className="datos-error" role="alert">{error}</p>}
        {!cargando && estadisticas && !estadisticas.perfil && <p>Este perfil ya no está disponible.</p>}
        {!cargando && estadisticas?.perfil && (
          <>
            <header className="perfil-publico-header">
              <AvatarUsuario
                userId={userId}
                nombre={estadisticas.perfil.username}
                avatarUrl={estadisticas.perfil.avatar_url}
                avatarPosition={estadisticas.perfil.avatar_position}
                size={76}
              />
              <div>
                <h2 id="perfil-publico-titulo">{estadisticas.perfil.username}</h2>
                {estadisticas.perfil.role === "admin" && <span className="perfil-publico-rol">Administración</span>}
              </div>
            </header>

            <p className="perfil-publico-bio">
              {estadisticas.perfil.bio.trim() || "Este perfil aún no tiene biografía."}
            </p>

            <InsigniasUsuario estadisticas={estadisticas} />

            <div className="perfil-publico-resumen">
              <div><strong>{estadisticas.inscripciones_aceptadas}</strong><span>Partidas jugadas</span></div>
              <div><strong>{estadisticas.partidas_dirigidas}</strong><span>Partidas dirigidas</span></div>
              <div><strong>{estadisticas.sesiones_jugadas}</strong><span>Sesiones jugadas</span></div>
              <div><strong>{estadisticas.sesiones_dirigidas}</strong><span>Sesiones dirigidas</span></div>
            </div>

            <section className="perfil-publico-companeros">
              <details>
                <summary>Historial de partidas ({estadisticas.historial.length})</summary>
                {estadisticas.historial.length === 0 ? <p>Aún no hay partidas en el historial.</p> : (
                  <ul>
                    {estadisticas.historial.map((partida) => (
                      <li key={partida.partida_id}>
                        <strong>{partida.titulo}</strong>
                        <span>{partida.sistema} · {partida.rol} · {partida.sesiones_jugadas} sesiones</span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </section>

            <section className="perfil-publico-companeros">
              <h3>Compañeros frecuentes</h3>
              {estadisticas.top_companeros.length === 0 ? <p>Aún no hay sesiones compartidas.</p> : (
                <ul>
                  {estadisticas.top_companeros.map((companero: CompaneroFrecuente) => (
                    <li key={companero.id}>
                      <AvatarUsuario userId={companero.id} nombre={companero.username} avatarUrl={companero.avatar_url} avatarPosition={companero.avatar_position} size={34} />
                      <PerfilUsuarioLink userId={companero.id} nombre={companero.username} />
                      <span>{companero.sesiones_coincidentes} sesiones</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {esAdmin && (
              <div className="perfil-publico-admin">
                <label>
                  <input
                    type="checkbox"
                    checked={estadisticas.perfil.apoyo_kofi}
                    disabled={guardandoAdmin}
                    onChange={(event) => void cambiarApoyo(event.target.checked)}
                  />
                  Apoyo Ko-fi confirmado
                </label>
                {errorAdmin && <p className="datos-error" role="alert">{errorAdmin}</p>}
              </div>
            )}

            <AmigosPerfil userId={userId} nombre={estadisticas.perfil.username} />
          </>
        )}
      </section>
    </div>
  );
}
