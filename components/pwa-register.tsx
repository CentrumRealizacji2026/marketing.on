"use client";

import { useEffect } from "react";

/** Rejestruje service workera, dzięki czemu aplikację można zainstalować na telefonie. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Brak service workera nie psuje aplikacji — działa dalej jako zwykła strona.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
