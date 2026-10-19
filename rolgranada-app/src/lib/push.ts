import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'TU_CLAVE_PUBLICA_VAPID_AQUI'; 

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushStatus = 'ok' | 'no_soportado' | 'denegado' | 'error' | 'sin_clave';

export async function activarPush(userId: string, solicitarPermiso = false): Promise<PushStatus> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Las notificaciones Push no son compatibles con este navegador.');
    return 'no_soportado';
  }

  try {
    let permission = Notification.permission;
    if (permission !== 'granted' && solicitarPermiso) {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('Permiso de notificaciones denegado o no concedido.');
      return 'denegado';
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('TU_CLAVE')) {
        console.warn('Clave VAPID pública no configurada.');
        return 'sin_clave';
      }
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        subscription: subscription as any,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Error al guardar la suscripción push en Supabase:', error);
      return 'error';
    }

    console.log('¡Suscripción Push configurada y guardada con éxito!');
    return 'ok';
  } catch (error) {
    console.error('Error durante la activación de web push:', error);
    return 'error';
  }
}