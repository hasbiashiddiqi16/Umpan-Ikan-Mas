import "server-only";

/** Jeda antarpercobaan baca basis data (total tiga kali percobaan). */
const JEDA_PERCOBAAN_MS = [150, 450];

/**
 * Satu-satunya pola coba ulang untuk bacaan basis data saat render.
 *
 * Kenapa dipusatkan: kegagalan koneksi sesaat (pooler basis data
 * penuh/koneksi putus) pernah berulang kali berubah menjadi halaman
 * basi yang tersimpan di cache ISR — daftar resep jatuh ke katalog
 * bawaan, rating kembali kosong, detail resep menjadi 404/galat.
 * Setiap bacaan render kini memakai pola yang sama persis:
 *
 * 1. Coba sampai tiga kali dengan jeda singkat; koneksi baru dari
 *    pool biasanya lolos pada percobaan berikutnya.
 * 2. Bila tetap gagal, LEMPAR galatnya. Halaman ISR yang gagal
 *    digambar tidak disimpan, jadi versi baik terakhir tetap
 *    disajikan dan halaman pulih sendiri pada gambar ulang
 *    berikutnya — tidak ada lagi hasil gagal yang menempel sejam.
 *
 * Pengecualian (basis data memang tidak terkonfigurasi, atau sedang
 * prerender build) diputuskan pemanggil lewat `isDatabaseConfigured`
 * dan `sedangPrerenderBuild`, bukan ditelan di sini.
 */
export async function bacaDenganCobaUlang<T>(operasi: () => Promise<T>): Promise<T> {
  let percobaan = 0;
  for (;;) {
    try {
      return await operasi();
    } catch (error) {
      if (percobaan >= JEDA_PERCOBAAN_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, JEDA_PERCOBAAN_MS[percobaan]));
      percobaan += 1;
    }
  }
}

/** True saat Next sedang prerender build; render gagal di fase ini tidak boleh menggagalkan build. */
export function sedangPrerenderBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}
