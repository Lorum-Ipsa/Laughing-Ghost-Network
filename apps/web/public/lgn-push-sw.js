/* LGN push notifications. This worker does not intercept or cache requests. */
self.addEventListener('push', event => {
  let payload;
  try { payload = event.data?.json(); } catch { return; }
  if (!payload || !/^[a-f0-9-]{36}$/i.test(payload.id)) return;
  event.waitUntil(self.registration.showNotification('Laughing Ghost Network', {
    body: 'You have a new notice in Ghost Space.',
    tag: 'lgn-' + payload.id,
    icon: '/ghost-favicon.svg',
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL('/ghost-space?section=notifications', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const inbox = windows.find(client => client.url === destination);
    if (inbox) await inbox.focus();
    else await self.clients.openWindow(destination);
  })());
});
