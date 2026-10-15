import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './ModalPreferenciasUsuario.css';

type ModalPreferenciasProps = {
  userId: string;
  esMaster?: boolean;
  onClose: () => void;
};

export default function ModalPreferenciasUsuario({ userId, esMaster = false, onClose }: ModalPreferenciasProps) {
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    async function cargarPerfilUsuario() {
      setCargando(true);
      const { data, error: err } = await supabase
        .from('profiles')
        .select('username, pronombres, avatar_url, avatar_position, rol_preferencias, lineas_evitar, estilo_master')
        .eq('id', userId)
        .single();

      if (!activo) return;
      setCargando(false);
      if (err) setError(err.message);
      else setPerfil(data);
    }
    void cargarPerfilUsuario();
    return () => { activo = false; };
  }, [userId]);

  const avatarPos = perfil?.avatar_position ? perfil.avatar_position.split(' ') : ['50', '50', '100'];
  const posX = avatarPos[0] || '50';
  const posY = avatarPos[1] || '50';
  const zoom = avatarPos[2] || '100';

  const tieneFotoValida = Boolean(perfil?.avatar_url && perfil.avatar_url.trim() !== '');

  // Comprobamos si rol_preferencias está vacío (ej. {} o null/undefined) o no contiene claves válidas
  const prefs = perfil?.rol_preferencias;
  const tienePreferenciasValidas = 
    prefs && 
    typeof prefs === 'object' && 
    Object.keys(prefs).length > 0 &&
    (prefs.roleplay !== undefined || prefs.combate !== undefined || prefs.exploracion !== undefined);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal-panel animate-fade" role="dialog" aria-modal="true" aria-labelledby="modal-pref-title">
        <header className="modal-header">
          <div>
            <span className="modal-badge-rol">{esMaster ? 'Perfil de Master' : 'Perfil de Jugador'}</span>
            <h2 id="modal-pref-title">Preferencias</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">×</button>
        </header>

        {cargando && <p className="modal-loading" role="status">Cargando datos del usuario…</p>}
        {error && <p className="datos-error" role="alert">{error}</p>}

        {!cargando && perfil && (
          <div className="modal-preferencias-contenido">
            <div className="modal-perfil-user-header">
              {tieneFotoValida ? (
                <div className="modal-avatar-frame">
                  <img
                    src={perfil.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      objectPosition: `${posX}% ${posY}%`,
                      transform: `scale(${Number(zoom) / 100})`,
                      transformOrigin: `${posX}% ${posY}%`
                    }}
                  />
                </div>
              ) : (
                <div className="modal-avatar-frame modal-avatar-placeholder">Sin foto</div>
              )}
              <div className="modal-user-identity">
                <h3 className="modal-username-heading">
                  {perfil.username}
                </h3>
                {perfil.pronombres && <span className="modal-pronombres-pill">{perfil.pronombres}</span>}
              </div>
            </div>

            {/* Si es Master */}
            {esMaster ? (
  <div className="modal-seccion-card">
    <div className="modal-card-header">
      <h4>Estilo de Máster</h4>
    </div>
    <p className={`modal-texto-contenido ${!perfil.estilo_master ? 'sin-respuesta' : ''}`}>
      {perfil.estilo_master ? perfil.estilo_master : 'Este Master aún no ha añadido notas.'}
    </p>
  </div>
) : (
              /* Si es Jugador */
              <>
                <div className="modal-seccion-card">
                  <div className="modal-card-header">
                    <h4>Preferencias de Juego</h4>
                  </div>
                  {tienePreferenciasValidas ? (
                    <div className="modal-stats-grid">
                      <div className="stat-item">
                        <div className="stat-label preferencias">
                          <span>Roleplay e Interpretación</span>
                          <strong>{prefs.roleplay ?? 3}/5</strong>
                        </div>
                        <div className="stat-bar-bg">
                          <div className="stat-bar-fill" style={{ width: `${((prefs.roleplay ?? 3) / 5) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="stat-item">
                        <div className="stat-label preferencias">
                          <span>Combate y Táctica</span>
                          <strong>{prefs.combate ?? 3}/5</strong>
                        </div>
                        <div className="stat-bar-bg">
                          <div className="stat-bar-fill" style={{ width: `${((prefs.combate ?? 3) / 5) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="stat-item">
                        <div className="stat-label preferencias">
                          <span>Exploración e Investigación</span>
                          <strong>{prefs.exploracion ?? 3}/5</strong>
                        </div>
                        <div className="stat-bar-bg">
                          <div className="stat-bar-fill" style={{ width: `${((prefs.exploracion ?? 3) / 5) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="modal-texto-contenido sin-respuesta">
                      Este jugador aún no ha rellenado sus preferencias.
                    </p>
                  )}
                </div>

                <div className="modal-seccion-card">
      <div className="modal-card-header">
        <h4>Líneas y Temas a Evitar</h4>
      </div>
      <p className={`modal-texto-contenido ${!perfil.lineas_evitar ? 'sin-respuesta' : ''}`}>
        {perfil.lineas_evitar ? perfil.lineas_evitar : 'No se han indicado líneas o temas sensibles a evitar.'}
      </p>
    </div>
  </>
)}
          </div>
        )}
      </section>
    </div>
  );
}