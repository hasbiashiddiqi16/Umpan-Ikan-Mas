"use client";

/**
 * Favorit resep di sisi klien.
 *
 * Pengunjung anonim: favorit hanya di localStorage perangkat ini
 * (perilaku lama). Pengguna yang masuk: daftar lokal digabung dengan
 * daftar akun di server (`/api/user/favorites`) saat sesi terdeteksi,
 * dan setiap perubahan sesudahnya dikirim ke server agar tersinkron
 * antarperangkat. Server tidak pernah menghapus favorit lokal —
 * gabungan (union) yang disimpan, jadi berpindah perangkat aman.
 */

const FAVORITES_KEY = "umpan-mas-favorites";
export const FAVORITES_EVENT = "umpan:favorites-change";
const SYNC_FLAG = "umpan-mas-favorites-synced";

export function readLocalFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))] : [];
  } catch {
    return [];
  }
}

export function writeLocalFavorites(slugs: string[]): string[] {
  const next = [...new Set(slugs)];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan penuh/diblokir: favorit sesi ini tetap di memori komponen.
  }
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: next }));
  return next;
}

async function kirimKeServer(slugs: string[]): Promise<void> {
  try {
    await fetch("/api/user/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs }),
    });
  } catch {
    // Gagal jaringan tidak boleh mengganggu pemakaian favorit lokal.
  }
}

/** Gabungkan favorit lokal dengan favorit akun. Mengembalikan daftar akhir. */
export async function syncFavoritesWithAccount(): Promise<string[]> {
  const lokal = readLocalFavorites();
  try {
    const response = await fetch("/api/user/favorites", { headers: { Accept: "application/json" } });
    if (!response.ok) return lokal; // 401 = anonim: tetap lokal saja.
    const data = (await response.json()) as { slugs?: unknown };
    const server = Array.isArray(data.slugs) ? data.slugs.filter((item): item is string => typeof item === "string") : [];
    const gabungan = [...new Set([...server, ...lokal])];
    writeLocalFavorites(gabungan);
    if (gabungan.length !== server.length) await kirimKeServer(gabungan);
    return gabungan;
  } catch {
    return lokal;
  }
}

/** Jalankan sinkronisasi sekali per sesi peramban saat pengguna masuk. */
export async function syncFavoritesOnce(): Promise<void> {
  try {
    if (sessionStorage.getItem(SYNC_FLAG)) return;
    sessionStorage.setItem(SYNC_FLAG, "1");
  } catch {
    // sessionStorage tak tersedia: sinkronisasi tetap dijalankan.
  }
  await syncFavoritesWithAccount();
}

/** Ubah status favorit satu resep (lokal selalu, server bila masuk). */
export function toggleFavorite(slug: string, aktif: boolean): string[] {
  const saatIni = readLocalFavorites();
  const next = aktif ? [...new Set([...saatIni, slug])] : saatIni.filter((item) => item !== slug);
  writeLocalFavorites(next);
  void kirimKeServerJikaMasuk(next);
  return next;
}

async function kirimKeServerJikaMasuk(slugs: string[]): Promise<void> {
  try {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) await kirimKeServer(slugs);
  } catch {
    // Supabase belum dikonfigurasi: favorit lokal tetap berfungsi.
  }
}
