-- Tipe air (kolam/sungai/danau) sebagai pertimbangan tersendiri.
--
-- Alasan: situs ini menyatakan karakter air berbeda antarkolam, jadi provinsi
-- bukan patokan utama. Resep perlu bisa ditandai tipe perairannya, dan ulasan
-- perlu bisa mencatat tipe air yang benar-benar dicoba supaya bobotnya bisa
-- dievaluasi nanti (hit-rate@3) — bukan ditulis permanen tanpa bukti.
--
--   cms_recipes.water_bodies -> daftar tipe air resep (jsonb, boleh kosong)
--   cms_reviews.water_body   -> tipe air yang dicoba pengirim (opsional)
ALTER TABLE cms_recipes ADD COLUMN IF NOT EXISTS water_bodies jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE cms_reviews ADD COLUMN IF NOT EXISTS water_body varchar(30);
