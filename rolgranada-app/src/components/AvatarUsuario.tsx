import { usePerfilPublico } from "../perfil/contextoPerfilPublico";
import "./AvatarUsuario.css";

type Props = {
  userId: string;
  nombre: string;
  avatarUrl?: string | null;
  avatarPosition?: string | null;
  size?: number;
};

function normalizarPosicion(position?: string | null) {
  const [rawX, rawY, rawZoom] = (position ?? "").trim().split(/\s+/);
  const parsePosition = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number(value.replace("%", ""));
    return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : fallback;
  };
  const x = parsePosition(rawX, 50);
  const y = parsePosition(rawY, 50);
  const rawScale = rawZoom ? Number(rawZoom.replace("%", "")) : 100;
  const zoom = Number.isFinite(rawScale) ? Math.min(300, Math.max(100, rawScale)) : 100;
  return { objectPosition: `${x}% ${y}%`, transform: `scale(${zoom / 100})`, transformOrigin: `${x}% ${y}%` };
}

export default function AvatarUsuario({ userId, nombre, avatarUrl, avatarPosition, size = 40 }: Props) {
  const abrirPerfil = usePerfilPublico();
  const posicion = normalizarPosicion(avatarPosition);
  return (
    <button
      type="button"
      className="avatar-usuario"
      style={{ width: size, height: size }}
      onClick={() => abrirPerfil(userId)}
      aria-label={`Ver perfil de ${nombre}`}
      title={`Ver perfil de ${nombre}`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" style={posicion} />
      ) : (
        <span aria-hidden="true">{nombre.trim().slice(0, 1).toLocaleUpperCase("es") || "?"}</span>
      )}
    </button>
  );
}
