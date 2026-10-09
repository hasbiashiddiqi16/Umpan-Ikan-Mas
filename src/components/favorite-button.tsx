"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

const FAVORITES_KEY = "umpan-mas-favorites";

function storedFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

export function FavoriteButton({ recipeSlug, className = "", label = "Simpan resep" }: { recipeSlug: string; className?: string; label?: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const syncFavorite = () => setSaved(storedFavorites().includes(recipeSlug));
    syncFavorite();
    const update = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      setSaved(Array.isArray(detail) ? detail.includes(recipeSlug) : storedFavorites().includes(recipeSlug));
    };
    window.addEventListener("umpan:favorites-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("umpan:favorites-change", update);
      window.removeEventListener("storage", update);
    };
  }, [recipeSlug]);

  function toggle() {
    const current = storedFavorites();
    const next = saved ? current.filter((slug) => slug !== recipeSlug) : [...new Set([...current, recipeSlug])];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    setSaved(!saved);
    window.dispatchEvent(new CustomEvent("umpan:favorites-change", { detail: next }));
  }

  return <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? "Hapus dari favorit" : label} className={className}><Heart size={17} fill={saved ? "currentColor" : "none"} />{saved ? "Tersimpan" : label}</button>;
}
