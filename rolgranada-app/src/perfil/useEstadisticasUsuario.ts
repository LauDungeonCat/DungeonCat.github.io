import { useEffect, useState } from "react";
import type { EstadisticasUsuario } from "../types";
import { featureRpc } from "../lib/featureRpc";

export function useEstadisticasUsuario(userId: string | null, refreshKey = 0) {
  const [resultado, setResultado] = useState<{
    clave: string;
    estadisticas: EstadisticasUsuario | null;
    error: string | null;
  } | null>(null);
  const clave = userId ? `${userId}:${refreshKey}` : null;

  useEffect(() => {
    let activa = true;
    if (!userId || !clave) return () => { activa = false; };
    void featureRpc("estadisticas_usuario", { p_user_id: userId })
      .then((resultado) => {
        if (activa) setResultado({ clave, estadisticas: resultado, error: null });
      })
      .catch((cause: unknown) => {
        if (activa) setResultado({
          clave,
          estadisticas: null,
          error: cause instanceof Error ? cause.message : "No se pudieron cargar las estadísticas.",
        });
      });

    return () => { activa = false; };
  }, [clave, userId]);

  const actual = clave !== null && resultado?.clave === clave ? resultado : null;
  return {
    estadisticas: actual?.estadisticas ?? null,
    cargando: Boolean(clave && !actual),
    error: actual?.error ?? null,
  };
}
