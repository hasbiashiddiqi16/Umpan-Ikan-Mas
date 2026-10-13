import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicConfig } from "./env";

/**
 * Klien Supabase untuk komponen sisi klien (`"use client"`). Panggil di dalam
 * komponen atau fungsi, bukan di tingkat modul, agar konfigurasi dibaca saat
 * dipakai — bukan saat bundel dievaluasi.
 */
export function createClient() {
  const { url, key } = requireSupabasePublicConfig();
  return createBrowserClient(url, key);
}
