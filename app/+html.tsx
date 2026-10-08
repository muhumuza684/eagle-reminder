import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// The service worker is registered on the real site only. On localhost it is
// removed, so a development session never runs on a stale cached copy.
const SERVICE_WORKER_SCRIPT = `
  if ('serviceWorker' in navigator) {
    var local = ['localhost', '127.0.0.1', '[::1]'].indexOf(window.location.hostname) !== -1;
    if (local) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (registration) { registration.unregister(); });
      }).catch(function () {});
      if (window.caches) {
        caches.keys().then(function (keys) {
          keys.forEach(function (key) { if (key.indexOf('d-eagle-pwa-') === 0) caches.delete(key); });
        }).catch(function () {});
      }
    } else {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <meta name="theme-color" content="#090706" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <script dangerouslySetInnerHTML={{ __html: SERVICE_WORKER_SCRIPT }} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: "html,body{background:#090706}" }} />
      </head>

      <body>{children}</body>
    </html>
  );
}