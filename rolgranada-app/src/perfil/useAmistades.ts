import { useCallback, useEffect, useState } from "react";
import { featureRpc } from "../lib/featureRpc";
import type { DatosAmistad } from "../types";

export function useAmistades(userId: string | null, activa = true) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [resultado, setResultado] = useState<{
    clave: string;
    datos: DatosAmistad;
    error: null;
  } | {
    clave: string;
    datos: null;
    error: string;
  } | null>(null);
  const clave = userId && activa ? `${userId}:${refreshKey}` : null;

  useEffect(() => {
    let vigente = true;
    if (!userId || !activa || !clave) return () => { vigente = false; };
    void featureRpc("listar_amistades", { p_user_id: userId })
      .then((datos) => {
        if (vigente) setResultado({ clave, datos, error: null });
      })
      .catch((cause: unknown) => {
        if (vigente) setResultado({
          clave,
          datos: null,
          error: cause instanceof Error ? cause.message : "No se pudieron cargar las amistades.",
        });
      });
    return () => { vigente = false; };
  }, [activa, clave, userId]);

  const actualizar = useCallback(async (operacion: () => Promise<unknown>) => {
    try {
      await operacion();
      setResultado(null);
      setRefreshKey((actual) => actual + 1);
    } catch (cause) {
      const mensaje = cause instanceof Error ? cause.message : "No se pudo actualizar la amistad.";
      setResultado(clave ? { clave, datos: null, error: mensaje } : null);
      throw cause;
    }
  }, [clave]);

  const solicitar = useCallback((destinatarioId: string) => actualizar(
    () => featureRpc("solicitar_amistad", { p_user_id: destinatarioId }),
  ), [actualizar]);

  const responder = useCallback((solicitudId: string, aceptar: boolean) => actualizar(
    () => featureRpc("responder_solicitud_amistad", { p_solicitud_id: solicitudId, p_aceptar: aceptar }),
  ), [actualizar]);

  const cancelar = useCallback((solicitudId: string) => actualizar(
    () => featureRpc("cancelar_solicitud_amistad", { p_solicitud_id: solicitudId }),
  ), [actualizar]);

  const eliminar = useCallback((amigoId: string) => actualizar(
    () => featureRpc("eliminar_amistad", { p_user_id: amigoId }),
  ), [actualizar]);

  const actual = clave && resultado?.clave === clave ? resultado : null;
  return {
    datos: actual?.datos ?? null,
    cargando: Boolean(clave && !actual),
    error: actual?.error ?? null,
    solicitar,
    responder,
    cancelar,
    eliminar,
  };
}
