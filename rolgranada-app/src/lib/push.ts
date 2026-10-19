import { supabase } from './supabase';
import type { Json } from './database.types';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

let ultimoError = '';
/** Texto técnico del último fallo, para mostrarlo en pantalla (útil en móvil, sin consola). */
export function detalleErrorPush() {
  return ultimoError;
}

export type ResultadoPush = 'activado' | 'denegado' | 'no_soportado' | 'servicio_push' | 'sin_clave' | 'error';

function urlBase64ToUint8Array(base64: string) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(normal);
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

/** Push real necesita HTTPS + service worker + PushManager. */
export function pushSoportado() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Pide permiso (si hace falta), registra el service worker, crea la suscripción
 * push y la guarda en push_subscriptions. Es seguro llamarla en cada login:
 * si ya hay permiso y suscripción solo la vuelve a sincronizar.
 */
export async function activarPush(userId: string, mostrarConfirmacion = false): Promise<ResultadoPush> {
  if (!pushSoportado()) return 'no_soportado';
  if (!VAPID_PUBLIC_KEY) {
    ultimoError = 'VITE_VAPID_PUBLIC_KEY está vacía en este build';
    return 'sin_clave';
  }

  try {
    const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permiso !== 'granted') return 'denegado';

    // La web vive en un subdirectorio (/rolgranada/): el service worker y su scope
    // deben colgar de la base de Vite, no de la raíz del dominio.
    const base = new URL(import.meta.env.BASE_URL, document.baseURI);
    const registro = await navigator.serviceWorker.register(new URL('sw.js', base).href, { scope: base.pathname });
    await navigator.serviceWorker.ready;
    ultimoError = '';

    const suscripcion =
      (await registro.pushManager.getSubscription()) ??
      (await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }));

    // Evita duplicados del mismo dispositivo
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .filter('subscription->>endpoint', 'eq', suscripcion.endpoint);

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({ user_id: userId, subscription: suscripcion.toJSON() as unknown as Json });
    if (error) throw error;

    if (mostrarConfirmacion) {
      // En Android/Chrome móvil `new Notification()` lanza "Illegal constructor":
      // hay que usar siempre el service worker.
      await registro.showNotification('Rol Granada', {
        body: '¡Notificaciones activadas correctamente!',
        icon: `${base.pathname}favicon.ico`,
      });
    }
    return 'activado';
  } catch (error) {
    const e = error as { name?: string; message?: string };
ultimoError = `${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`;
if (e?.name === 'AbortError') return 'servicio_push';
return 'error';
  }
}