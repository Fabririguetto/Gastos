// Service worker mínimo: solo habilita la instalación como PWA.
// No cachea nada para evitar mostrar datos financieros desactualizados.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // pass-through: siempre red, nunca cache
});
