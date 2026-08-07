/* Runner Code AI — Service Worker (Push Notifications) */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Runner Code AI', body: event.data.text() }; }

  const isInbox   = data.type === 'inbox';
  const isSupport = data.type === 'support';

  const title = data.title || 'Runner Code AI';

  const options = {
    body: data.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: data.type || 'runner-code',
    renotify: true,
    silent: false,
    vibrate: [100, 50, 100],
    timestamp: Date.now(),
    actions: isInbox
      ? [{ action: 'open', title: 'Open Inbox' }, { action: 'dismiss', title: 'Dismiss' }]
      : isSupport
        ? [{ action: 'open', title: 'View Reply' }, { action: 'dismiss', title: 'Dismiss' }]
        : [{ action: 'open', title: 'Open' }],
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'NAVIGATE', url });
      } else {
        self.clients.openWindow(self.location.origin + url);
      }
    })
  );
});
