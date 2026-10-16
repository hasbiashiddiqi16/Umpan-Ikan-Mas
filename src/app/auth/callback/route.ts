import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { tujuanAman } from "@/lib/auth-shared";

/**
 * Tujuan kembali dari tautan email & Google (Supabase Auth). Kode sekali
 * pakai ditukar menjadi sesi (cookie), lalu pengguna diarahkan ke tujuan
 * internal yang sudah disaring.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tujuan = tujuanAman(searchParams.get("next"));
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${tujuan}`);
    } catch {
      // Jatuh ke halaman masuk dengan pesan di bawah.
    }
  }
  return NextResponse.redirect(`${origin}/masuk?next=${encodeURIComponent(tujuan)}`);
}
