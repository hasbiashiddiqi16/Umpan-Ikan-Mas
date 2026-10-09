"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, ShieldCheck, UserRound } from "lucide-react";
import { recipes } from "@/data/recipes";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState, SectionHeader } from "@/components/shared";

const FAVORITES_KEY = "umpan-mas-favorites";
function readFavorites(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

export function ProfileView() {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  useEffect(() => {
    const syncFavorites = () => setFavoriteSlugs(readFavorites());
    syncFavorites();
    const update = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      setFavoriteSlugs(Array.isArray(detail) ? detail : readFavorites());
    };
    window.addEventListener("umpan:favorites-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("umpan:favorites-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  const savedRecipes = recipes.filter((recipe) => favoriteSlugs.includes(recipe.slug));
  function clearFavorites() {
    localStorage.setItem(FAVORITES_KEY, "[]");
    setFavoriteSlugs([]);
    window.dispatchEvent(new CustomEvent("umpan:favorites-change", { detail: [] }));
  }

  return (
    <div>
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#203e2c] px-6 py-8 text-white sm:px-10 sm:py-10"><div className="absolute -right-12 -top-20 -z-10 h-56 w-56 rounded-full border-[34px] border-white/[.05]" /><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><UserRound size={22} /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.15em] text-[#d9c994]">Ruang mancingmu</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Halo, Pemancing!</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Tanpa akun, resep favoritmu tetap tersimpan di perangkat ini. Kembali kapan saja untuk menyiapkan sesi berikutnya.</p><div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-white/80"><ShieldCheck size={14} /> Data lokal di perangkatmu</div></section>
      <section id="favorit" className="scroll-mt-24 pt-10"><SectionHeader eyebrow="Koleksi pribadi" title="Resep Favorit" subtitle={`${savedRecipes.length} racikan tersimpan di perangkat ini.`} action={savedRecipes.length > 0 ? <button type="button" onClick={clearFavorites} className="text-sm font-bold text-[#9a604a] hover:underline">Hapus semua</button> : undefined} />
        {savedRecipes.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{savedRecipes.map((recipe, index) => <RecipeCard key={recipe.slug} recipe={recipe} featured={index === 0} />)}</div> : <div className="rounded-[24px] border border-dashed border-[#dce4d9] bg-white p-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f9eee8] text-[#a5654e]"><Heart size={23} /></span><h2 className="mt-4 text-lg font-extrabold text-[#304133]">Belum ada resep tersimpan</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#788378]">Ketuk ikon hati pada racikan yang ingin kamu coba. Favorit akan muncul di sini tanpa perlu membuat akun.</p><Link href="/katalog" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white">Cari racikan <ArrowRight size={15} /></Link></div>}
      </section>
      <section className="mt-12 rounded-[24px] border border-[#e6eae3] bg-[#f6f8f4] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7"><div><p className="text-sm font-extrabold text-[#344638]">Sesi mancing berikutnya dimulai dari sini</p><p className="mt-1 text-sm text-[#778276]">Cocokkan racikan dengan kondisi spotmu hari ini.</p></div><Link href="/ai-umpan" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white sm:mt-0">Coba AI Umpan <ArrowRight size={15} /></Link></section>
    </div>
  );
}
