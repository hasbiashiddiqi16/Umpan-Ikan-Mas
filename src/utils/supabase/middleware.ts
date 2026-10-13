import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabasePublicConfig } from "./env";

/** Awalan nama cookie sesi Supabase (mis. `sb-abcdef-auth-token`). */
const SESSION_COOKIE_PREFIX = "sb-";

/**
 * Menyegarkan sesi Supabase pada setiap permintaan dan menulis cookie yang
 * diperbarui ke respons. Dipanggil dari `src/proxy.ts` (konvensi `proxy` di
 * Next.js 16, sebelumnya bernama `middleware`).
 *
 * Dua hal yang dijaga di sini:
 * - Tanpa variabel lingkungan Supabase, permintaan diteruskan apa adanya
 *   sehingga situs tetap berjalan.
 * - Permintaan penyegaran ke Supabase hanya dilakukan bila pengunjung memang
 *   punya cookie sesi, supaya pengunjung biasa tidak menambah satu perjalanan
 *   ke jaringan di setiap permintaan.
 */
export async function updateSession(request: NextRequest) {
  const config = supabasePublicConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cookie sesi tidak boleh di-cache CDN atau proxy perantara.
        Object.entries(headers).forEach(([header, value]) => response.headers.set(header, value));
      },
    },
  });

  const hasSessionCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith(SESSION_COOKIE_PREFIX));
  if (!hasSessionCookie) return response;

  try {
    // Memicu penyegaran token; kegagalan jaringan tidak boleh menggagalkan halaman.
    await supabase.auth.getUser();
  } catch {
    // Biarkan permintaan berjalan dengan sesi yang ada.
  }

  return response;
}
