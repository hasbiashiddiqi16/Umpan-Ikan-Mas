import "server-only";

import { createClient } from "@/utils/supabase/server";
import { supabasePublicConfig } from "@/utils/supabase/env";

export type CurrentUser = {
  id: string;
  email: string;
  /** Nama tampil: dari metadata akun (display_name/full_name) atau awalan email. */
  name: string;
};

function namaTampil(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const meta = user.user_metadata ?? {};
  for (const key of ["display_name", "full_name", "name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 100);
  }
  const email = user.email ?? "";
  const prefix = email.split("@")[0]?.trim();
  return prefix ? prefix.slice(0, 100) : "Pengguna";
}

/**
 * Pengguna yang sedang masuk (sesi Supabase Auth), atau `null` bila
 * pengunjung anonim / Supabase belum dikonfigurasi. Identitas hanya
 * dibaca dari sesi; semua akses data tetap lewat API server yang
 * memeriksa fungsi ini — tidak ada kunci rahasia di peramban.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!supabasePublicConfig()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "", name: namaTampil(data.user) };
  } catch {
    return null;
  }
}
