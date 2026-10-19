// Service worker de Rol Granada: recibe los push del servidor y los muestra,
// incluso con la web cerrada. Debe servirse desde la raíz (/sw.js).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { mensaje: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo || 'Rol Granada', {
      body: datos.mensaje || 'Tienes una nueva notificación.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: datos.id || undefined,
      data: { url: datos.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if ('focus' in ventana) return ventana.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});