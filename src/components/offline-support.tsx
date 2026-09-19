"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineSupport() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let generation = 0;
    const update = () => {
      const current = ++generation;
      setOffline(!navigator.onLine);
      // LAN connectivity can report online even when this app is unreachable:
      // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
      // HEAD bypasses the app cache and never downloads or uploads user data.
      if (process.env.NODE_ENV === "production" && navigator.onLine) {
        void fetch("/sw.js", {
          method: "HEAD",
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        })
          .then((response) => {
            if (current === generation) setOffline(!response.ok);
          })
          .catch(() => {
            if (current === generation) setOffline(true);
          });
      }
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      // A cache failure must not block online practice or local progress.
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    } else if ("serviceWorker" in navigator) {
      // A previous production preview must not keep serving stale files in dev.
      void navigator.serviceWorker
        .getRegistration("/")
        .then((registration) => {
          if (registration?.active?.scriptURL === `${location.origin}/sw.js`)
            return registration.unregister();
        })
        .catch(() => {});
    }
    return () => {
      generation++;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline ? (
    <div className="offline-note" role="status">
      <WifiOff size={14} /> Offline. Your practice and progress stay here with you.
    </div>
  ) : null;
}
