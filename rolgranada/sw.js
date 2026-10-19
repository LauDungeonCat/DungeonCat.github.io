// Service worker de Rol Granada: recibe los push del servidor y los muestra,
// incluso con la web cerrada. Vive junto al index.html (p. ej. /rolgranada/sw.js)
// y su scope es esa misma carpeta.
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
      icon: self.registration.scope + 'favicon.ico',
      badge: self.registration.scope + 'favicon.ico',
      tag: datos.id || undefined,
      data: { url: self.registration.scope },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if ('focus' in ventana) return ventana.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});