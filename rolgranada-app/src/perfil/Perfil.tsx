import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';
import { TEMAS_SENSIBLES, normalizarTemasPerfil, type NivelPerfil } from '../temasSensibles';
import crownIcon from '../assets/crown.svg';
import './Perfil.css';
import '../partidas/FormularioPartida.css';

export default function Perfil() {
  const { profile, updateProfile, signOut } = useAuth();

  const [tabActiva, setTabActiva] = useState<'general' | 'jugador' | 'master'>('general');

  // Estados del formulario general
  const [username, setUsername] = useState<string>('');
  const [pronombres, setPronombres] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [posX, setPosX] = useState<number>(50);
  const [posY, setPosY] = useState<number>(50);
  const [zoom, setZoom] = useState<number>(100);
  
  // Preferencias de juego
  const [roleplay, setRoleplay] = useState<number>(3);
  const [combate, setCombate] = useState<number>(3);
  const [exploracion, setExploracion] = useState<number>(3);
  const [lineasEvitar, setLineasEvitar] = useState<string>(''); // se muestra como el campo "Otro"
  const [temasSeleccion, setTemasSeleccion] = useState<Record<string, NivelPerfil>>({});

  // Perfil de Máster
  const [estiloMaster, setEstiloMaster] = useState<string>('');

  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

  // Estado para controlar el modal de aviso de cierre de sesión
  const [mostrarModalCerrarSesion, setMostrarModalCerrarSesion] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const profileAny = profile as any;
    
    setUsername(profile.username ?? '');
    setPronombres(profileAny.pronombres ?? '');
    setAvatarUrl(profile.avatar_url ?? '');

    if (profileAny.avatar_position) {
      const partes = profileAny.avatar_position.split(' ');
      if (partes.length >= 2) {
        const parsedX = Number(partes[0]);
        const parsedY = Number(partes[1]);
        setPosX(!isNaN(parsedX) ? parsedX : 50);
        setPosY(!isNaN(parsedY) ? parsedY : 50);
      }
      if (partes.length >= 3) {
        const parsedZoom = Number(partes[2]);
        setZoom(!isNaN(parsedZoom) ? parsedZoom : 100);
      }
    }
    
    if (profileAny.rol_preferencias) {
      setRoleplay(profileAny.rol_preferencias.roleplay ?? 3);
      setCombate(profileAny.rol_preferencias.combate ?? 3);
      setExploracion(profileAny.rol_preferencias.exploracion ?? 3);
    }
    
    setLineasEvitar(profileAny.lineas_evitar ?? '');
    setEstiloMaster(profileAny.estilo_master ?? '');
  }, [profile]);

  // Líneas y velos: se leen directamente de la tabla profiles (columna temas_sensibles)
  useEffect(() => {
    if (!profile?.id) return;
    let activo = true;
    void supabase
      .from('profiles')
      .select('temas_sensibles')
      .eq('id', profile.id)
      .single()
      .then(({ data }) => {
        if (!activo || !data) return;
        const temas = normalizarTemasPerfil((data as { temas_sensibles?: unknown }).temas_sensibles);
        const seleccion: Record<string, NivelPerfil> = {};
        temas.velos.forEach((id) => { seleccion[id] = 'velo'; });
        temas.lineas.forEach((id) => { seleccion[id] = 'linea'; });
        setTemasSeleccion(seleccion);
      });
    return () => { activo = false; };
  }, [profile?.id]);

  function cambiarTema(id: string, nivel: NivelPerfil | null) {
    setTemasSeleccion((actual) => {
      const siguiente = { ...actual };
      if (nivel) siguiente[id] = nivel;
      else delete siguiente[id];
      return siguiente;
    });
  }

  const totalLineas = Object.values(temasSeleccion).filter((nivel) => nivel === 'linea').length;
  const totalVelos = Object.values(temasSeleccion).filter((nivel) => nivel === 'velo').length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile?.id) {
      setErrorPerfil('No se encontró una sesión activa.');
      return;
    }

    setGuardando(true);
    setMensajeExito(null);
    setErrorPerfil(null);

    try {
      const rolPreferencias = { roleplay, combate, exploracion };
      const avatarFinal: string | null = avatarUrl.trim() !== '' ? avatarUrl.trim() : null;
      const avatarPosicionStr = `${Math.round(posX)} ${Math.round(posY)} ${Math.round(zoom)}`;

      const temasSensibles = {
        lineas: TEMAS_SENSIBLES.filter((tema) => temasSeleccion[tema.id] === 'linea').map((tema) => tema.id),
        velos: TEMAS_SENSIBLES.filter((tema) => temasSeleccion[tema.id] === 'velo').map((tema) => tema.id),
      };
      const { error: errorTemas } = await supabase
        .from('profiles')
        .update({ temas_sensibles: temasSensibles })
        .eq('id', profile.id);
      if (errorTemas) throw new Error(errorTemas.message);

      await updateProfile(
        username, 
        avatarFinal, 
        rolPreferencias, 
        lineasEvitar, 
        estiloMaster,
        pronombres,
        avatarPosicionStr
      );

      setMensajeExito('¡Perfil actualizado correctamente!');
    } catch (err) {
      setErrorPerfil(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  }

  const ejecutarCerrarSesion = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <div className="perfil-container">
      <header className="perfil-cabecera">
        <div className="perfil-titulo-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {profile?.role === 'admin' && (
            <img 
              src={crownIcon} 
              alt="Admin Crown" 
              title="Administrador"
              className="perfil-admin-crown"
            />
          )}
          <h1 className="page-title" style={{ margin: 0 }}>Mi Perfil</h1>
        </div>
        <p className="perfil-subtitulo">Gestiona tu identidad en la comunidad y tus preferencias de rol.</p>
      </header>

      <div className="perfil-tabs">
        <button
          type="button"
          className={`perfil-tab-btn ${tabActiva === 'general' ? 'active' : ''}`}
          onClick={() => setTabActiva('general')}
        >
          General
        </button>
        <button
          type="button"
          className={`perfil-tab-btn ${tabActiva === 'jugador' ? 'active' : ''}`}
          onClick={() => setTabActiva('jugador')}
        >
          Perfil de Juego
        </button>
        <button
          type="button"
          className={`perfil-tab-btn ${tabActiva === 'master' ? 'active' : ''}`}
          onClick={() => setTabActiva('master')}
        >
          Perfil de Máster
        </button>
      </div>

      <form className="perfil-form-card" onSubmit={handleSubmit}>
        {tabActiva === 'general' && (
          <div className="perfil-seccion-tab animate-fade">
            <h3>Información General e Identidad</h3>
            <p className="perfil-help-text">Tu nombre de usuario, pronombres e imagen se mostrarán de forma unificada en la comunidad.</p>
            
            <div className="perfil-general-content">
              <div className="perfil-avatar-preview-container">
                {avatarUrl ? (
                  <div className="perfil-avatar-frame-redondo">
                    <img 
                      src={avatarUrl} 
                      alt="Vista previa avatar" 
                      className="perfil-avatar-grande-redondo" 
                      style={{ 
                        objectPosition: `${posX}% ${posY}%`,
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: `${posX}% ${posY}%`
                      }}
                    />
                  </div>
                ) : (
                  <div className="perfil-avatar-frame-redondo perfil-avatar-placeholder">Sin imagen</div>
                )}
              </div>

              <div className="perfil-inputs-col">
                <div className="perfil-row-inputs">
                  <label className="input-flex-2">
                    <span className="label-title">Nombre de usuario</span>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={48}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </label>
                  <label className="input-flex-1">
                    <div className="label-header">
                      <span className="label-title">Pronombres</span>
                      <span className="label-opcional">(opcional)</span>
                    </div>
                    <input
                      type="text"
                      maxLength={24}
                      value={pronombres}
                      onChange={(e) => setPronombres(e.target.value)}
                      placeholder="él/ella, elle..."
                    />
                  </label>
                </div>

                <label>
                  <div className="label-header">
                    <span className="label-title">URL del Avatar</span>
                    <span className="label-opcional">(opcional)</span>
                  </div>
                  <input
                    type="url"
                    maxLength={500}
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://ejemplo.com/avatar.jpg"
                  />
                </label>

                {avatarUrl && (
                  <div className="perfil-ajuste-posicion">
                    <span>Ajustar encuadre de la imagen:</span>
                    <div className="perfil-sliders-posicion">
                      <label>
                        Horizontal ({posX}%):
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={posX} 
                          style={{ '--value-percent': `${posX}%` } as React.CSSProperties}
                          onChange={(e) => setPosX(Number(e.target.value))} 
                        />
                      </label>
                      <label>
                        Vertical ({posY}%):
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={posY} 
                          style={{ '--value-percent': `${posY}%` } as React.CSSProperties}
                          onChange={(e) => setPosY(Number(e.target.value))} 
                        />
                      </label>
                      <label>
                        Zoom ({zoom}%):
                        <input 
                          type="range" 
                          min="100" 
                          max="300" 
                          value={zoom} 
                          style={{ '--value-percent': `${((zoom - 100) / (300 - 100)) * 100}%` } as React.CSSProperties}
                          onChange={(e) => setZoom(Number(e.target.value))} 
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tabActiva === 'jugador' && (
          <div className="perfil-seccion-tab animate-fade">
            <h3>Perfil de Juego</h3>
            <p className="perfil-help-text">Indica del 1 al 5 cuánto disfrutas de cada aspecto en tus partidas:</p>
            
            <div className="perfil-slider-group">
              <label>
                <span>Roleplay e Interpretación: <strong>{roleplay}/5</strong></span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={roleplay}
                  style={{ '--value-percent': `${((roleplay - 1) / (5 - 1)) * 100}%` } as React.CSSProperties}
                  onChange={(e) => setRoleplay(Number(e.target.value))}
                />
              </label>

              <label>
                <span>Combate y Táctica: <strong>{combate}/5</strong></span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={combate}
                  style={{ '--value-percent': `${((combate - 1) / (5 - 1)) * 100}%` } as React.CSSProperties}
                  onChange={(e) => setCombate(Number(e.target.value))}
                />
              </label>

              <label>
                <span>Exploración e Investigación: <strong>{exploracion}/5</strong></span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={exploracion}
                  style={{ '--value-percent': `${((exploracion - 1) / (5 - 1)) * 100}%` } as React.CSSProperties}
                  onChange={(e) => setExploracion(Number(e.target.value))}
                />
              </label>
            </div>

            <h3 className="perfil-subseccion">Líneas y velos</h3>

            <div className="lineas-velos-explicacion">
              <p>
                <span className="lv-etiqueta linea">Línea</span>
                Algo que no quieres que aparezca en la partida de ninguna forma, ni mostrado ni mencionado.
                Es un límite firme: el DM no lo incluirá.
              </p>
              <p>
                <span className="lv-etiqueta velo">Velo</span>
                Algo que puede existir en la historia, pero sin verse: se menciona de pasada o ocurre fuera de escena,
                como cuando una película corta a negro, sin detalles.
              </p>
              <p className="lv-nota">
                Marca solo los temas que quieras evitar; lo que dejes en «Ninguno» se entiende que no te supone problema.
                Si entras en una partida que incluya alguno, tu DM recibirá un aviso para hablarlo contigo.
              </p>
            </div>

            <p className="temas-resumen">Líneas: <strong>{totalLineas}</strong> · Velos: <strong>{totalVelos}</strong></p>

            <ul className="temas-lista">
              {TEMAS_SENSIBLES.map((tema) => {
                const nivelActual = temasSeleccion[tema.id] ?? null;
                return (
                  <li className={`tema-fila${nivelActual ? ` es-${nivelActual}` : ''}`} key={tema.id}>
                    <span className="tema-nombre" id={`tema-${tema.id}`}>{tema.etiqueta}</span>
                    <div className="tema-selector" role="group" aria-labelledby={`tema-${tema.id}`}>
                      <button
                        type="button"
                        className={`tema-opcion${nivelActual === null ? ' activo' : ''}`}
                        aria-pressed={nivelActual === null}
                        onClick={() => cambiarTema(tema.id, null)}
                      >
                        Ninguno
                      </button>
                      <button
                        type="button"
                        className={`tema-opcion velo${nivelActual === 'velo' ? ' activo' : ''}`}
                        aria-pressed={nivelActual === 'velo'}
                        onClick={() => cambiarTema(tema.id, 'velo')}
                      >
                        Velo
                      </button>
                      <button
                        type="button"
                        className={`tema-opcion linea${nivelActual === 'linea' ? ' activo' : ''}`}
                        aria-pressed={nivelActual === 'linea'}
                        onClick={() => cambiarTema(tema.id, 'linea')}
                      >
                        Línea
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <label className="perfil-textarea-label">
              <div className="label-header">
                <span className="label-title">Otro</span>
                <span className="label-opcional">(temas que no estén en la lista)</span>
              </div>
              <textarea
                rows={3}
                value={lineasEvitar}
                onChange={(e) => setLineasEvitar(e.target.value)}
                placeholder="Ej. Otros temas que prefieres evitar o que se traten con velo..."
              />
            </label>
          </div>
        )}

        {tabActiva === 'master' && (
          <div className="perfil-seccion-tab animate-fade">
            <h3>Perfil de Máster</h3>
            <p className="perfil-help-text">Define tu estilo dirigiendo, sistemas que dominas o tipo de campañas que sueles ofrecer.</p>
            
            <label className="perfil-textarea-label">
              <span>Estilo de Dirección y Preferencias como DM</span>
              <textarea
                rows={5}
                value={estiloMaster}
                onChange={(e) => setEstiloMaster(e.target.value)}
                placeholder="Describe cómo te gusta dirigir (sandbox, lineal, enfocado a narrativa, letalidad alta...)"
              />
            </label>
          </div>
        )}

        {errorPerfil && <p className="datos-error" role="alert">{errorPerfil}</p>}
        {mensajeExito && <p className="datos-exito" role="status">{mensajeExito}</p>}

        {/* Zona inferior de acciones con cerrar sesión a la izquierda y guardar a la derecha */}
        <div className="perfil-acciones" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            type="button"
            className="btn-secundario btn-salir-perfil"
            onClick={() => setMostrarModalCerrarSesion(true)}
          >
            Cerrar Sesión (Salir)
          </button>
          
          <button type="submit" className="btn-rojo" disabled={guardando}>
            {guardando ? 'Guardando cambios...' : 'Guardar Perfil'}
          </button>
        </div>
      </form>

      {/* Modal de confirmación reutilizando las clases exactas de FormularioPartida.css */}
      {mostrarModalCerrarSesion && (
        <div className="crear-campana-overlay" onMouseDown={(e) => e.target === e.currentTarget && setMostrarModalCerrarSesion(false)}>
          <section className="crear-campana-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-cerrar-sesion-titulo">
            <header className="crear-campana-header">
              <div>
                <p className="seccion-etiqueta" style={{ color: "#a8131a" }}>Atención</p>
                <h2 id="modal-cerrar-sesion-titulo">Cerrar sesión</h2>
              </div>
              <button type="button" className="crear-campana-cerrar" onClick={() => setMostrarModalCerrarSesion(false)}>×</button>
            </header>

            <div className="crear-campana-form">
              <p>
                ¿De verdad quieres cerrar sesión en este dispositivo?
              </p>
              <div className="crear-campana-acciones">
                <button className="crear-campana-cancelar" type="button" onClick={() => setMostrarModalCerrarSesion(false)}>
                  Cancelar
                </button>
                <button 
                  className="crear-campana-enviar" 
                  type="button" 
                  style={{ backgroundColor: "#c02642", borderColor: "#a8131a" }} 
                  onClick={() => void ejecutarCerrarSesion()}
                >
                  Sí, cerrar sesión
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}