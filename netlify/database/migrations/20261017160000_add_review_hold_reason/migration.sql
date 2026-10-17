-- Moderasi ulasan berbasis risiko: alasan sebuah ulasan ditahan (pending)
-- untuk ditinjau admin. Ulasan berisiko rendah langsung approved tanpa kolom ini.
alter table "cms_reviews" add column if not exists "hold_reason" varchar(255);
