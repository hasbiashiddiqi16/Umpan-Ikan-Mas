"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Memastikan navigasi antarhalaman selalu dimulai dari bagian atas.
 * Link hash dibiarkan ditangani browser agar tombol menuju bagian tertentu
 * (misalnya #bahan dan #ulasan) tetap berfungsi.
 */
export function RouteScrollReset() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!pathname) return;

    const previous = previousPathname.current;
    previousPathname.current = pathname;

    // Jangan mengubah posisi pada muatan awal, navigasi yang sama, atau deep link hash.
    if (!previous || previous === pathname || window.location.hash) return;

    const scrollToPageTop = () => {
      // scroll-behavior global bernilai smooth untuk anchor. Untuk perpindahan
      // halaman, posisi harus dipulihkan secara instan agar halaman tidak sempat
      // terlihat pada posisi scroll milik halaman sebelumnya.
      const root = document.documentElement;
      const inlineScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      root.style.scrollBehavior = inlineScrollBehavior;
    };

    scrollToPageTop();
    const animationFrame = window.requestAnimationFrame(scrollToPageTop);
    const timer = window.setTimeout(scrollToPageTop, 0);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
