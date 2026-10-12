"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTracked = useRef("");
  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard") || pathname.startsWith("/api")) return;
    const normalized = pathname.slice(0, 500);
    if (lastTracked.current === normalized) return;
    lastTracked.current = normalized;
    const type = normalized.startsWith("/resep/") ? "recipe_view" : "page_view";
    // Hindari Array.prototype.at (belum ada di WebKit lama, mis. iOS <= 15.3).
    const pathSegments = type === "recipe_view" ? normalized.split("/").filter(Boolean) : [];
    const entitySlug = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : undefined;
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: normalized, type, entitySlug }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
