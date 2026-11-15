import { createContext, useContext } from "react";

export const PerfilPublicoContext = createContext<(userId: string) => void>(() => undefined);

export function usePerfilPublico() {
  return useContext(PerfilPublicoContext);
}
