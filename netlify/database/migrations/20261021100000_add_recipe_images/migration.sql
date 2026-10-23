-- Galeri foto resep: satu resep dapat memiliki beberapa foto.
--
-- Kolom `image` yang sudah ada tetap menjadi thumbnail (dipakai kartu,
-- pratinjau, dan metadata berbagi), sedangkan kolom baru `images`
-- menyimpan seluruh daftar foto terurut. Foto lama yang bukan foto
-- bawaan dijadikan isi awal galeri agar tidak ada tampilan yang berubah.

ALTER TABLE "cms_recipes" ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint

UPDATE "cms_recipes"
SET "images" = jsonb_build_array("image")
WHERE ("images" IS NULL OR "images" = '[]'::jsonb)
  AND "image" <> ''
  AND "image" <> '/images/recipe-putih.jpg';
