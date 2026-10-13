import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabasePublicConfig } from "./env";

/**
 * Klien Supabase untuk Server Component, Server Action, dan Route Handler.
 *
 * Selalu buat klien baru untuk setiap permintaan — jangan disimpan di variabel
 * global. Saat `setAll` dipanggil dari Server Component (yang tidak boleh
 * menulis cookie), kegagalannya diabaikan karena penyegaran sesi ditangani
 * `src/proxy.ts`.
 *
 * Catatan: `setAll` sebenarnya menerima argumen kedua berisi header anti-cache
 * yang harus menemani cookie sesi. Di sini argumen itu sengaja tidak dipakai
 * karena komponen server tidak bisa menyetel header respons; saat nanti memakai
 * Supabase Auth di Route Handler, terapkan header tersebut pada respons Anda
 * sendiri (lihat dokumentasi @supabase/ssr).
 */
export async function createClient() {
  const { url, key } = requireSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component: cukup diabaikan, sesi disegarkan di proxy.
        }
      },
    },
  });
}
