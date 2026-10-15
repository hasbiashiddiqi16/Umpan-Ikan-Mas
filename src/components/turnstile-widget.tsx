"use client";

import { useEffect, useRef } from "react";

/**
 * Widget Cloudflare Turnstile untuk formulir ulasan.
 *
 * Widget hanya muncul bila `NEXT_PUBLIC_TURNSTILE_SITE_KEY` disetel saat build —
 * situs tetap berjalan tanpa Turnstile (honeypot dan pembatasan laju yang
 * bekerja). Pemeriksaan tokennya dilakukan di server dengan
 * `TURNSTILE_SECRET_KEY`; kunci rahasia tidak pernah sampai ke peramban.
 */

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || widgetId.current || !container.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [onToken, siteKey]);

  if (!siteKey) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold text-[#656d65] (4.59:1 terburuk)">Verifikasi anti-bot (Cloudflare Turnstile)</p>
      <div ref={container} />
    </div>
  );
}
