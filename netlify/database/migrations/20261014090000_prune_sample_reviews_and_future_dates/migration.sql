-- Ulasan contoh lama dibuat 25 per resep (5.000 baris) dan sebagian bertanggal
-- masa depan. Sekarang ulasan contoh hanya 3 per resep, dan tanggal apa pun yang
-- melewati waktu server dirapikan.
--
-- 1) Sisakan hanya 3 ulasan contoh pertama per resep (pola seed_key: catalog:<slug>:01..03).
DELETE FROM "cms_reviews"
WHERE "seed_key" ~ '^catalog:[a-z0-9-]+:[0-9]{2}$'
  AND "seed_key" !~ '^catalog:[a-z0-9-]+:0[1-3]$';
--> statement-breakpoint
-- 2) Tidak boleh ada ulasan bertanggal masa depan, baik kiriman pengunjung
--    maupun ulasan contoh yang sudah tersinkron.
UPDATE "cms_reviews"
SET "created_at" = now()
WHERE "created_at" > now();
