/**
 * Aset merek. Logo dilayani lewat `/api/media/logo` supaya bisa diganti dari
 * dashboard (Content Studio → Tampilan) tanpa membangun ulang situs: alamatnya
 * tetap sama, isinya mengikuti unggahan admin atau berkas bawaan di
 * `public/images/logo-umpan-mas.png`. Karena itu pemakaiannya di `next/image`
 * perlu `unoptimized` agar tidak tertahan cache optimizer.
 */
export const LOGO_SRC = "/api/media/logo";
export const LOGO_ALT = "Logo UMPAN MAS: ikan mas dan bola umpan";
export const BRAND_NAME = "UMPAN MAS";
