-- Durasi sesi dan jumlah joran pada ulasan pengunjung.
--
-- Alasan: angka hasil tangkapan ("8 ekor") tidak bisa dibandingkan tanpa tahu
-- berapa lama sesinya dan berapa joran yang dipakai. Keduanya **opsional** —
-- ulasan tetap bisa dikirim tanpa keduanya, dan angka laju tidak pernah
-- dikarang kalau durasinya tidak diisi.
--
--   cms_reviews.session_minutes -> durasi sesi dalam menit (30–1440)
--   cms_reviews.rod_count       -> jumlah joran (1–10)
ALTER TABLE cms_reviews ADD COLUMN IF NOT EXISTS session_minutes integer;
ALTER TABLE cms_reviews ADD COLUMN IF NOT EXISTS rod_count integer;
