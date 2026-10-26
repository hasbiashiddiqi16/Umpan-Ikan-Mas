import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { tujuanAman } from "@/lib/auth-shared";

/**
 * Tujuan kembali dari tautan email & Google (Supabase Auth). Kode sekali
 * pakai ditukar menjadi sesi (cookie), lalu pengguna diarahkan ke tujuan
 * internal yang sudah disaring.
 *
 * Bila Supabase sendiri yang menolak (mis. provider Google belum aktif,
 * tautan email kedaluwarsa, atau izin dibatalkan), ia mengalihkan ke sini
 * dengan parameter `error`. Parameter itu tidak ditampilkan mentah ke
 * pengguna — diterjemahkan menjadi pesan singkat di halaman masuk.
 */
function pesanGalatCallback(searchParams: URLSearchParams, gagalTukar: boolean, untukReset = false): string {
  const deskripsi = (searchParams.get("error_description") ?? "").toLowerCase();
  const kode = `${searchParams.get("error_code") ?? ""} ${searchParams.get("error") ?? ""}`.toLowerCase();
  if (deskripsi.includes("provider is not enabled") || deskripsi.includes("unsupported provider")) {
    return "Masuk dengan Google belum diaktifkan di server. Pakai email dan kata sandi dulu ya — atau coba lagi setelah pengaturannya dilengkapi.";
  }
  if (deskripsi.includes("access_denied") || kode.includes("access_denied")) {
    return "Izin masuk dibatalkan sebelum selesai. Tidak apa-apa, silakan coba lagi kapan pun.";
  }
  if (kode.includes("otp_expired") || kode.includes("expired") || deskripsi.includes("expired")) {
    if (untukReset) return "Tautan atur ulang kata sandi sudah kedaluwarsa. Minta tautan baru dari halaman Lupa Kata Sandi.";
    return "Tautan di email sudah kedaluwarsa. Masuk dengan email dan kata sandimu, atau daftar ulang untuk mendapat tautan baru.";
  }
  if (gagalTukar) return untukReset ? "Tautan atur ulang tidak berlaku lagi. Minta tautan baru dari halaman Lupa Kata Sandi." : "Tautan masuk tidak berlaku lagi. Silakan masuk kembali.";
  return untukReset ? "Proses atur ulang belum selesai. Silakan minta tautan baru." : "Proses masuk belum selesai. Silakan coba lagi.";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tujuan = tujuanAman(searchParams.get("next"));
  let gagalTukar = false;
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${tujuan}`);
      gagalTukar = true;
    } catch {
      gagalTukar = true;
    }
  }
  const pesan = pesanGalatCallback(searchParams, gagalTukar, tujuan === "/lupa-sandi/reset");
  return NextResponse.redirect(`${origin}/masuk?next=${encodeURIComponent(tujuan)}&pesan=${encodeURIComponent(pesan)}`);
}
