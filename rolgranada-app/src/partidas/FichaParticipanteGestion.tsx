import AvatarUsuario from "../components/AvatarUsuario";
import PerfilUsuarioLink from "../components/PerfilUsuarioLink";

type FichaParticipanteProps = {
    userId: string;
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
    userId,
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
    const tieneDisp = franjasIndicadas > 0;

    return (
        <div className="gestion-jugador-li" style={{ width: '100%' }}>
            <div className="gestion-jugador-identidad">
                <div className="gestion-avatar-redondo" style={{ opacity: cargado ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }}>
                    <AvatarUsuario userId={userId} nombre={nombre} avatarUrl={avatarUrl} avatarPosition={avatarPosition} size={44} />
                </div>
                <div className="gestion-jugador-datos-texto">
                    <span className="gestion-rol-titulo">{rol}</span>
                    <strong><PerfilUsuarioLink userId={userId} nombre={nombre} /></strong>
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