type FichaParticipanteProps = {
    nombre: string;
    rol: string;
    avatarUrl: string | null;
    avatarPosition: string | null;
    franjasIndicadas: number;
    franjasSinIndicar: number;
    cargado: boolean;
    onVerPreferencias: () => void;
    onQuitar?: () => void;
};

export function FichaParticipanteGestion({
    nombre,
    rol,
    avatarUrl,
    avatarPosition,
    franjasIndicadas,
    franjasSinIndicar,
    cargado,
    onVerPreferencias,
    onQuitar,
}: FichaParticipanteProps) {
    const avatarPos = avatarPosition ? avatarPosition.split(' ') : ['50', '50', '100'];
    const tieneAvatar = Boolean(avatarUrl && avatarUrl.trim() !== '');
    const tieneDisp = franjasIndicadas > 0;

    return (
        <div className="gestion-jugador-li" style={{ width: '100%' }}>
            <div className="gestion-jugador-identidad">
                {tieneAvatar ? (
                    <div className="gestion-avatar-redondo" style={{ opacity: cargado ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }}>
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
                    <div className="gestion-avatar-redondo gestion-avatar-placeholder">{rol === 'Master' ? 'DM' : 'User'}</div>
                )}
                <div className="gestion-jugador-datos-texto">
                    <span className="gestion-rol-titulo">{rol}</span>
                    <strong>{nombre}</strong>
                    <span
                        className={`jugador-disponibilidad ${!tieneDisp ? "sin-disponibilidad" : "con-disponibilidad"}`}
                        style={{ opacity: cargado ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }}
                        title="El resumen cuenta las franjas desde hoy en adelante."
                    >
                        {franjasIndicadas === 0
                            ? "No ha rellenado este mes"
                            : franjasSinIndicar > 0
                                ? `Parcial este mes: ${franjasIndicadas} franjas indicadas, ${franjasSinIndicar} sin indicar`
                                : `${franjasIndicadas} franjas indicadas este mes`}
                    </span>
                </div>
            </div>

            <div className="gestion-jugador-acciones-item">
                <button type="button" className="btn-ver-preferencias" onClick={onVerPreferencias}>
                    {rol === 'Master' ? 'Ver preferencias' : 'Preferencias'}
                </button>
                {onQuitar && (
                    <button type="button" className="btn-quitar-jugador" onClick={onQuitar}>
                        Quitar
                    </button>
                )}
            </div>
        </div>
    );
}