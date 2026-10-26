-- Kunci foto resep berversi berbentuk "recipe-<slug>-v<versi>", yaitu slug
-- ditambah 23 karakter ("recipe-" + "-v" + versi 14 karakter). Kolom
-- cms_media.key hanya varchar(60), sehingga resep dengan slug 38 karakter
-- atau lebih selalu gagal menyimpan foto dari dashboard (dan penyimpanan
-- resepnya ikut batal). Lebarkan ke varchar(255): slug maksimum yang
-- divalidasi formulir (180 karakter) menghasilkan kunci maksimum 203
-- karakter, jadi selalu muat.
ALTER TABLE "cms_media" ALTER COLUMN "key" TYPE varchar(255);
