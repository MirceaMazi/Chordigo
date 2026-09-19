/* Generated into public/sw.js after next build. New versions wait until all
 * existing app tabs close, so an update never interrupts a practice session. */
/* global __CHORDIGO_CACHE__, __CHORDIGO_ASSETS__ */
const CACHE = __CHORDIGO_CACHE__;
const ASSETS = __CHORDIGO_ASSETS__;
const ROOMS = ["/practice", "/chords", "/progress", "/tuner"];
const PUBLIC_ASSETS = [
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/paper-grain.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([...ROOMS, ...PUBLIC_ASSETS, ...ASSETS]);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("chordigo-") && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // RSC navigation must never receive a cached HTML document. When offline,
  // Next falls back to a full navigation, served by the document branch below.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate" && (ROOMS.includes(url.pathname) || url.pathname === "/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(url.pathname, response.clone());
          if (response.ok || response.status < 500) return response;
        } catch {
          /* Use the complete local room when the connection is unavailable. */
        }
        const cached = await cache.match(url.pathname === "/" ? "/practice" : url.pathname, {
          ignoreVary: true,
        });
        return (
          cached ??
          new Response("Reconnect once to prepare your practice room.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      })(),
    );
  } else if (url.pathname.startsWith("/_next/static/") || PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
