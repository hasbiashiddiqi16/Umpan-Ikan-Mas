-- Laporan pengunjung terhadap ulasan yang sudah tampil publik.
-- Satu laporan per perangkat per ulasan; laporan terbuka ditinjau admin di
-- Studio -> Moderasi Ulasan, dan tiga pelapor berbeda menahan ulasan otomatis.
create table if not exists "cms_review_reports" (
  "id" serial primary key,
  "review_id" integer not null,
  "reason" varchar(30) not null,
  "device" varchar(64),
  "ip_hash" varchar(64),
  "status" varchar(20) not null default 'open',
  "created_at" timestamptz not null default now()
);
create index if not exists "cms_review_reports_review_idx" on "cms_review_reports" ("review_id");
create index if not exists "cms_review_reports_status_idx" on "cms_review_reports" ("status");
create unique index if not exists "cms_review_reports_review_device_unique" on "cms_review_reports" ("review_id", "device");
