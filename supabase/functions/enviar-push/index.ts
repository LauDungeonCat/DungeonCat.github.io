// Edge Function llamada por un Database Webhook (INSERT en public.notificaciones).
// Envía un Web Push a todos los dispositivos suscritos del usuario destinatario.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!, // p. ej. mailto:tu-correo@ejemplo.com
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const { record } = await req.json();
  if (!record?.user_id) return new Response('Sin registro', { status: 400 });

  const { data: suscripciones, error } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', record.user_id);

  if (error) {
    console.error(error);
    return new Response('Error leyendo suscripciones', { status: 500 });
  }

  const carga = JSON.stringify({
    id: record.id,
    titulo: record.titulo,
    mensaje: record.mensaje,
    url: '/',
  });

  const resultados = await Promise.all(
    (suscripciones ?? []).map(async (s) => {
      try {
        // urgency 'high' evita que Android (Doze/ahorro de batería) retrase el aviso;
        // TTL: si el dispositivo está apagado, el aviso caduca a la hora.
        await webpush.sendNotification(s.subscription, carga, { urgency: 'high', TTL: 3600 });
        return 'enviada';
      } catch (e) {
        const codigo = (e as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) {
          // Suscripción caducada o desinstalada: se limpia
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
          return `caducada_${codigo}`;
        }
        console.error('Fallo enviando push', e);
        return `error_${codigo ?? 'desconocido'}`;
      }
    })
  );

  // El resumen queda visible en net._http_response.content para diagnosticar
  return new Response(
    JSON.stringify({ suscripciones: resultados.length, resultados }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});