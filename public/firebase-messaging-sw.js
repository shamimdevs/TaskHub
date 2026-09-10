/*
 * Background push handler.
 *
 * A service worker is a static file served outside the Next bundle, so it
 * cannot read NEXT_PUBLIC_* — src/lib/firebase-client.ts registers it with the
 * config on the query string and it is read back here. The compat builds are
 * used because a service worker cannot load ES modules from a CDN.
 */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const params = new URL(self.location).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  if (!title) return;
  self.registration.showNotification(title, {
    body: body ?? "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    // One TaskHub notification replaces the last, rather than stacking up.
    tag: "taskhub",
    data: { href: payload.data?.href || "/" },
  });
});

// Tapping the notification focuses an open tab if there is one, rather than
// opening a second copy of the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      for (const tab of tabs) {
        if (tab.url.includes(self.location.origin) && "focus" in tab) {
          tab.navigate?.(href);
          return tab.focus();
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});
