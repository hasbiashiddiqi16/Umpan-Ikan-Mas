import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminSessionSignature } from "@/lib/admin-auth";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Titik masuk proxy (konvensi Next.js 16, sebelumnya `middleware.ts`).
 *
 * Empat tugas:
 * 1. Mengalihkan alamat lama fitur yang sudah berganti nama di level kode
 *    (`/ai-umpan` → `/tanya-umpan`, `/sistem-pakar` → `/pakar-umpan`) secara
 *    permanen sambil mempertahankan query string, agar tautan lama tidak mati.
 * 2. Menyegarkan sesi Supabase pada setiap permintaan.
 * 3. **Gerbang autentikasi area admin.** `/dashboard*` tidak boleh terbuka bagi
 *    pengunjung biasa: permintaan tanpa cookie sesi yang sah langsung dialihkan
 *    ke `/login` sebelum halaman dirender. Pemeriksaan di sini sengaja ringan
 *    (tanda tangan + masa berlaku, tanpa menyentuh basis data). Pemeriksaan
 *    penuh — termasuk versi password — tetap dilakukan `isAdminAuthenticated()`
 *    di `src/app/dashboard/layout.tsx` dan di setiap route handler admin.
 * 4. **`noindex` untuk area admin.** Respons `/dashboard*` dan `/login` diberi
 *    `X-Robots-Tag: noindex, nofollow`, jadi rute ini tidak masuk hasil pencarian
 *    meski ada tautan atau percobaan pengindeksan dari luar.
 */
const AUTH_GATE_PREFIXES = ["/dashboard"] as const;
const NO_INDEX_PREFIXES = ["/dashboard", "/login", "/masuk", "/daftar", "/lupa-sandi", "/bagikan", "/profil", "/auth"] as const;
const PENGALIHAN_RUTE_LAMA: Record<string, string> = {
  "/ai-umpan": "/tanya-umpan",
  "/sistem-pakar": "/pakar-umpan",
};

function cocokDengan(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function tanpaIndeks<T extends NextResponse>(response: T): T {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Alamat lama fitur yang berganti nama diteruskan permanen ke alamat baru;
  // clone URL mempertahankan query string (mis. kiriman Cari Cepat lama).
  const tujuanRuteBaru = PENGALIHAN_RUTE_LAMA[pathname];
  if (tujuanRuteBaru) {
    const url = request.nextUrl.clone();
    url.pathname = tujuanRuteBaru;
    return NextResponse.redirect(url, 308);
  }

  // Gerbang autentikasi: berhenti di sini kalau sesi tidak sah.
  if (AUTH_GATE_PREFIXES.some((prefix) => cocokDengan(pathname, prefix))) {
    const sesiSah = verifyAdminSessionSignature(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (!sesiSah) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      // Pengalihan tidak boleh disimpan: status sesi bisa berubah kapan saja.
      response.headers.set("Cache-Control", "no-store");
      return tanpaIndeks(response);
    }
  }

  const response = await updateSession(request);
  return NO_INDEX_PREFIXES.some((prefix) => cocokDengan(pathname, prefix)) ? tanpaIndeks(response) : response;
}

export const config = {
  // Lewati aset statis dan berkas gambar: tidak perlu menyentuh sesi di sana.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
