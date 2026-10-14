/**
 * Aset merek. Logo dilayani lewat `/api/media/logo` supaya bisa diganti dari
 * dashboard (Content Studio → Tampilan) tanpa membangun ulang situs: alamatnya
 * tetap sama, isinya mengikuti unggahan admin atau berkas bawaan di
 * `public/images/logo-umpan-mas.png`. Karena itu pemakaiannya di `next/image`
 * perlu `unoptimized` agar tidak tertahan cache optimizer.
 */
export const LOGO_SRC = "/api/media/logo";
/**
 * Logo untuk footer. Sengaja terpisah dari `LOGO_SRC` supaya footer bisa memakai
 * versi yang warnanya sesuai dengan teks putih di latar hijau gelap, sementara
 * navbar tetap memakai logo berwarna. Bawaannya berkas
 * `public/images/logo-footer.png`, dan tetap bisa diganti dari dashboard
 * (Content Studio → Tampilan) seperti aset lain.
 */
export const FOOTER_LOGO_SRC = "/api/media/logo-footer";
export const LOGO_ALT = "Logo UMPAN MAS: ikan mas dan bola umpan";
export const FOOTER_LOGO_ALT = "Logo UMPAN MAS untuk footer";
/**
 * Gambar latar bagian hero di beranda. Bawaannya `public/images/pond-hero.jpg`,
 * dan bisa diganti dari dashboard (Content Studio → Tampilan) tanpa deploy
 * ulang: alamatnya tetap `/api/media/hero`.
 */
export const HERO_SRC = "/api/media/hero";
/** Keterangan gambar dibuat umum karena gambarnya bisa diganti admin. */
export const HERO_ALT = "Suasana kolam pemancingan ikan mas";
export const BRAND_NAME = "UMPAN MAS";
