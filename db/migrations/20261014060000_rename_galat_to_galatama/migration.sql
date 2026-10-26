-- Menyeragamkan sebutan jenis kolam: "Galat" -> "Galatama".
--
-- Situs sempat memakai sebutan "Galat" untuk kolam galatama, padahal di dunia
-- pemancingan istilah yang dikenal adalah "Galatama". Kode aplikasi sekarang
-- memakai "Galatama" dan tetap membaca "Galat" sebagai sebutan lama, sehingga
-- data lama tidak hilang walau migrasi ini belum jalan. Migrasi ini merapikan
-- nilai yang sudah tersimpan supaya basis data dan antarmuka memakai sebutan
-- yang sama.
--
-- Aman dijalankan berulang: penggantian hanya mengenai kata "Galat" utuh
-- (batas kata \m ... \M), sehingga "Galatama" yang sudah benar tidak berubah
-- menjadi "Galatamaama".

UPDATE "cms_recipes"
SET "category" = 'Galatama'
WHERE "category" = 'Galat';
--> statement-breakpoint
-- Kolom jenis disimpan sebagai larik JSON, mis. ["Harian", "Galat"].
UPDATE "cms_recipes"
SET "fishing_types" = (
	SELECT COALESCE(jsonb_agg(
		CASE WHEN nilai = 'Galat' THEN 'Galatama' ELSE nilai END
		ORDER BY urutan
	), '[]'::jsonb)
	FROM jsonb_array_elements_text("fishing_types") WITH ORDINALITY AS jenis(nilai, urutan)
)
WHERE "fishing_types" @> '["Galat"]'::jsonb;
--> statement-breakpoint
-- Teks syarat/ketidaksesuaian, mis. "Kolam galat" -> "Kolam galatama".
UPDATE "cms_recipes"
SET "suitable" = (
	SELECT COALESCE(jsonb_agg(
		regexp_replace(regexp_replace(nilai, '\mGalat\M', 'Galatama', 'g'), '\mgalat\M', 'galatama', 'g')
		ORDER BY urutan
	), '[]'::jsonb)
	FROM jsonb_array_elements_text("suitable") WITH ORDINALITY AS syarat(nilai, urutan)
)
WHERE "suitable"::text ~ '\mGalat\M' OR "suitable"::text ~ '\mgalat\M';
--> statement-breakpoint
UPDATE "cms_recipes"
SET "not_suitable" = (
	SELECT COALESCE(jsonb_agg(
		regexp_replace(regexp_replace(nilai, '\mGalat\M', 'Galatama', 'g'), '\mgalat\M', 'galatama', 'g')
		ORDER BY urutan
	), '[]'::jsonb)
	FROM jsonb_array_elements_text("not_suitable") WITH ORDINALITY AS syarat(nilai, urutan)
)
WHERE "not_suitable"::text ~ '\mGalat\M' OR "not_suitable"::text ~ '\mgalat\M';
--> statement-breakpoint
-- Ringkasan resep katalog sempat menyebut "kolam galat".
UPDATE "cms_recipes"
SET "summary" = regexp_replace(regexp_replace("summary", '\mGalat\M', 'Galatama', 'g'), '\mgalat\M', 'galatama', 'g')
WHERE "summary" ~ '\mGalat\M' OR "summary" ~ '\mgalat\M';
--> statement-breakpoint
UPDATE "cms_reviews"
SET "fishing_type" = 'Galatama'
WHERE "fishing_type" = 'Galat';
