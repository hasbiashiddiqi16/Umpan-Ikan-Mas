-- Akun admin tambahan dashboard (Task 114): username + password sendiri
-- dengan peran siap pakai. Admin utama dari environment tidak disimpan
-- di tabel ini dan tetap menjadi cadangan tertinggi.
CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" varchar(32) NOT NULL,
  "name" varchar(80) NOT NULL,
  "password_hash" text NOT NULL,
  "role" varchar(20) NOT NULL DEFAULT 'hanya_lihat',
  "active" boolean NOT NULL DEFAULT true,
  "session_version" integer NOT NULL DEFAULT 1,
  "created_by" varchar(80),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_username_unique" ON "admin_users" ("username");
