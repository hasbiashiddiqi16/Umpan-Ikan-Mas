/**
 * Menyiapkan connection string PostgreSQL sebelum dipakai klien.
 *
 * Basis data terkelola (Netlify Database, Neon, Supabase — termasuk host pooler
 * `aws-0-<wilayah>.pooler.supabase.com`) mewajibkan koneksi TLS, sedangkan
 * driver `pg` tidak menyalakan TLS kecuali diminta. Supabase juga sudah tidak
 * menerbitkan alamat IPv4 untuk koneksi langsung `db.<ref>.supabase.co`, jadi
 * host pooler itulah yang bisa dijangkau dari Vercel/host IPv4 lainnya.
 *
 * Karena itu: untuk host non-lokal tanpa parameter `sslmode`, kita tambahkan
 * `sslmode=require` supaya kesalahan "SSL off" tidak terjadi. Basis data lokal
 * (localhost/127.0.0.1/::1) dibiarkan apa adanya, dan `sslmode` yang sudah
 * ditulis sendiri selalu dihormati — termasuk `sslmode=disable`.
 */
export type DatabaseUrlInfo = {
  /** Connection string siap pakai. */
  value: string;
  /** Mode TLS yang akhirnya dipakai. */
  ssl: "required" | "disabled" | "default";
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

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

  const sslMode = (url.searchParams.get("sslmode") ?? url.searchParams.get("ssl") ?? "").toLowerCase();
  if (sslMode) return { value, ssl: sslMode === "disable" ? "disabled" : "required" };
  if (LOCAL_HOSTS.has(url.hostname.toLowerCase())) return { value, ssl: "default" };

  url.searchParams.set("sslmode", "require");
  return { value: url.toString(), ssl: "required" };
}
