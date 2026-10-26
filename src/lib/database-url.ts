/**
 * Menyiapkan connection string PostgreSQL sebelum dipakai klien.
 *
 * Dua hal yang membuat `DATABASE_URL` ke Supabase sering gagal:
 *
 * 1. Koneksi langsung `db.<ref>.supabase.co` sekarang hanya punya alamat IPv6,
 *    jadi Vercel dan host ber-IPv4 lain tidak bisa menjangkaunya. Host pooler
 *    `aws-0-<wilayah>.pooler.supabase.com` masih punya alamat IPv4.
 * 2. Sertifikat Supabase ditandatangani CA internal ("Supabase Root 2021 CA")
 *    yang tidak ada di trust store Node. Padahal `pg` versi sekarang
 *    memperlakukan `sslmode=require` sebagai `verify-full`, sehingga koneksi
 *    ditolak dengan "self-signed certificate in certificate chain".
 *
 * Karena itu, untuk host Supabase kita menambahkan `uselibpqcompat=true`:
 * pg-connection-string memetakannya ke `rejectUnauthorized = false` — artinya
 * koneksi tetap terenkripsi TLS, hanya verifikasi sertifikat yang dilewati
 * (sesuai maksud `sslmode=require` di libpq). Untuk host lain dengan CA publik
 * (mis. Neon), verifikasi tetap penuh.
 *
 * Semua pilihan pengguna dihormati: `sslmode=disable` tidak pernah diubah, dan
 * `sslmode=verify-full`/`verify-ca` dibiarkan apa adanya.
 */
export type DatabaseUrlInfo = {
  /** Connection string siap pakai. */
  value: string;
  /** Mode TLS yang akhirnya dipakai. */
  ssl: "default" | "disabled" | "required" | "required-unverified";
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);
/** Host Supabase memakai CA internal, jadi verifikasi sertifikat tidak bisa dilakukan Node. */
const SUPABASE_HOST = /(^|\.)(supabase\.co|supabase\.com|supabase\.net)$/i;
/** Mode yang berarti "enkripsi tanpa memverifikasi sertifikat" (semantik libpq). */
const UNVERIFIED_MODES = new Set(["require", "prefer", "no-verify", "allow"]);

export function isSupabaseHost(hostname: string): boolean {
  return SUPABASE_HOST.test(hostname);
}

export function normalizeDatabaseUrl(raw: string | undefined): DatabaseUrlInfo {
  const value = raw?.trim() ?? "";
  if (!value) return { value, ssl: "default" };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Bukan URL yang bisa dibaca: biarkan klien yang melaporkan galatnya.
    return { value, ssl: "default" };
  }

  const host = url.hostname.toLowerCase();
  const local = LOCAL_HOSTS.has(host);
  const supabase = isSupabaseHost(host);
  const parameter = url.searchParams.has("sslmode") ? "sslmode" : url.searchParams.has("ssl") ? "ssl" : null;
  const mode = (parameter ? url.searchParams.get(parameter) : "")?.toLowerCase() ?? "";
  const hasLibpqCompat = url.searchParams.get("uselibpqcompat") === "true";

  if (mode === "disable") return { value, ssl: "disabled" };
  if (mode === "verify-full" || mode === "verify-ca") return { value, ssl: "required" };
  if (local && !mode) return { value, ssl: "default" };

  if (mode) {
    // Pengguna menulis sslmode sendiri. Untuk host Supabase, `require`/`prefer`
    // harus dibarengi uselibpqcompat supaya tidak ditolak sebagai self-signed.
    if (supabase && UNVERIFIED_MODES.has(mode) && !hasLibpqCompat) {
      url.searchParams.set("uselibpqcompat", "true");
      return { value: url.toString(), ssl: "required-unverified" };
    }
    return { value, ssl: UNVERIFIED_MODES.has(mode) ? "required-unverified" : "required" };
  }

  if (local) return { value, ssl: "default" };
  if (supabase) {
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("uselibpqcompat", "true");
    return { value: url.toString(), ssl: "required-unverified" };
  }
  url.searchParams.set("sslmode", "require");
  return { value: url.toString(), ssl: "required" };
}
