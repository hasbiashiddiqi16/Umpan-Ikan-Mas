/** Tujuan setelah masuk: hanya izinkan alamat internal situs. */
export function tujuanAman(next: string | null | undefined): string {
  if (!next) return "/profil";
  if (!next.startsWith("/") || next.startsWith("//")) return "/profil";
  if (next.startsWith("/masuk") || next.startsWith("/daftar") || next.startsWith("/auth")) return "/profil";
  return next.slice(0, 300);
}

/** Pesan bila email sudah memiliki akun, dari jalur galat maupun respons semu Supabase. */
export const PESAN_EMAIL_SUDAH_TERDAFTAR = "Email ini sudah terdaftar. Silakan masuk saja. Kalau dulu masuk lewat Google dan ingin memakai kata sandi, buat kata sandimu lewat halaman Lupa Kata Sandi.";

/** Pesan galat Supabase Auth diterjemahkan seperlunya agar mudah dipahami. */
export function pesanGalatAuth(message: string): string {
  const teks = message.toLowerCase();
  if (teks.includes("invalid login credentials")) return "Email atau kata sandi salah. Periksa lagi lalu coba kembali.";
  if (teks.includes("email not confirmed")) return "Email belum dikonfirmasi. Buka kotak masuk emailmu dan klik tautan konfirmasi, lalu masuk kembali.";
  if (teks.includes("already registered") || teks.includes("already been registered")) return PESAN_EMAIL_SUDAH_TERDAFTAR;
  if (teks.includes("password should be")) return "Kata sandi belum memenuhi syarat (minimal 6 karakter).";
  if (teks.includes("provider is not enabled") || teks.includes("unsupported provider")) return "Masuk dengan Google belum diaktifkan di server. Pakai email dan kata sandi dulu ya.";
  if (teks.includes("rate limit") || teks.includes("too many")) return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  return "Belum berhasil. Periksa isianmu lalu coba lagi.";
}
