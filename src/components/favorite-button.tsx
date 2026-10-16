"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { readLocalFavorites, toggleFavorite } from "@/lib/favorites-client";

function storedFavorites(): string[] { return readLocalFavorites(); }

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
    toggleFavorite(recipeSlug, !saved);
    setSaved(!saved);
  }

  return <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? "Hapus dari favorit" : label} className={className}><Heart size={17} fill={saved ? "currentColor" : "none"} />{saved ? "Tersimpan" : label}</button>;
}
