import { usePerfilPublico } from "../perfil/contextoPerfilPublico";

export default function PerfilUsuarioLink({ userId, nombre, className }: {
  userId: string;
  nombre: string;
  className?: string;
}) {
  const abrirPerfil = usePerfilPublico();
  return (
    <button type="button" className={`perfil-usuario-link${className ? ` ${className}` : ""}`} onClick={() => abrirPerfil(userId)}>
      {nombre}
    </button>
  );
}
