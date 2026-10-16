-- Akun pengguna publik (Supabase Auth): kepemilikan resep, ulasan
-- terhubung akun, dan favorit tersinkron antarperangkat.
alter table "cms_recipes" add column if not exists "owner_id" uuid;
create index if not exists "cms_recipes_owner_idx" on "cms_recipes" ("owner_id");

alter table "cms_reviews" add column if not exists "user_id" uuid;
create index if not exists "cms_reviews_user_idx" on "cms_reviews" ("user_id");

create table if not exists "user_favorites" (
  "user_id" uuid not null,
  "recipe_slug" varchar(180) not null,
  "created_at" timestamptz not null default now()
);
create unique index if not exists "user_favorites_user_slug_unique" on "user_favorites" ("user_id", "recipe_slug");
create index if not exists "user_favorites_user_idx" on "user_favorites" ("user_id");
