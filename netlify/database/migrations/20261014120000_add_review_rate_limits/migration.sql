-- Penjagaan anti-penyalahgunaan untuk ulasan kiriman publik.
--
-- Ulasan kini benar-benar dibagikan lewat server, dan pengirimnya anonim (tanpa
-- akun). Tiga kolom berikut menyimpan sidik jari HMAC (bukan nilai mentah),
-- sehingga tetap tidak ada data pribadi yang tersimpan:
--
--   device       -> id perangkat anonim dari token bertanda tangan (header x-review-device)
--   ip_hash      -> alamat IP pengirim (untuk pembatasan laju per IP)
--   payload_hash -> isi kiriman (untuk menolak kiriman ulang yang identik)
--
-- Indeksnya mempercepat dua pemeriksaan yang paling sering dipakai:
--   * satu ulasan per resep per perangkat per 24 jam  (device, recipe_slug, created_at)
--   * pembatasan laju per IP                          (ip_hash, created_at)
ALTER TABLE cms_reviews ADD COLUMN IF NOT EXISTS device varchar(64);
ALTER TABLE cms_reviews ADD COLUMN IF NOT EXISTS ip_hash varchar(64);
ALTER TABLE cms_reviews ADD COLUMN IF NOT EXISTS payload_hash varchar(64);

CREATE INDEX IF NOT EXISTS cms_reviews_device_recipe_created_idx
  ON cms_reviews (device, recipe_slug, created_at);

CREATE INDEX IF NOT EXISTS cms_reviews_ip_created_idx
  ON cms_reviews (ip_hash, created_at);
