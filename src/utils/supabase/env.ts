/**
 * Alamat dan kunci publik Supabase. Keduanya aman dipakai di peramban; kunci
 * rahasia (service role / secret key) tidak boleh ada di variabel NEXT_PUBLIC_.
 */
export type SupabasePublicConfig = { url: string; key: string };

export function supabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supabase menamai kunci publik ini "publishable"; proyek lama memakai "anon".
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export const SUPABASE_ENV_HINT =
  "Supabase belum dikonfigurasi. Setel NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (lihat .env.example), lalu deploy ulang.";

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = supabasePublicConfig();
  if (!config) throw new Error(SUPABASE_ENV_HINT);
  return config;
}
