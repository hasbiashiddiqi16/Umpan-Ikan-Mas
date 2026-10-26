import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import type { AdminRole } from "../src/lib/admin-roles";

/** `optional` menandai tambahan yang boleh dilewati, mis. kroto atau bahan amis. */
export type CmsIngredient = { name: string; brand: string; amount: string; optional?: boolean };

export const cmsRecipes = pgTable("cms_recipes", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: text("summary").notNull(),
  category: varchar("category", { length: 40 }).notNull().default("Harian"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  image: text("image").notNull().default("/images/recipe-putih.jpg"),
  /** Seluruh foto resep (terurut); `image` di atas adalah thumbnail pilihannya. */
  images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  price: varchar("price", { length: 80 }).notNull().default("Rp15.000–30.000"),
  priceValue: integer("price_value").notNull().default(20000),
  difficulty: varchar("difficulty", { length: 40 }).notNull().default("Mudah"),
  rating: integer("rating_tenths").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  users: integer("users").notNull().default(0),
  popularity: integer("popularity").notNull().default(0),
  weather: jsonb("weather").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  water: jsonb("water").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /**
   * Tipe perairan resep: "Kolam", "Sungai", "Danau" (lihat `WaterBody`). Kosong
   * berarti belum dilabeli editor; halaman publik menurunkan labelnya dari teks
   * resep seperti resep katalog (lihat `waterBodiesFromText`).
   */
  waterBodies: jsonb("water_bodies").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  fishingTypes: jsonb("fishing_types").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  provinces: jsonb("provinces").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  seasons: jsonb("seasons").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  ingredients: jsonb("ingredients").$type<CmsIngredient[]>().notNull().default(sql`'[]'::jsonb`),
  steps: jsonb("steps").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  suitable: jsonb("suitable").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  notSuitable: jsonb("not_suitable").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  author: varchar("author", { length: 100 }).notNull().default("Tim UMPAN MAS"),
  /**
   * Pemilik resep bila dibagikan pengguna terdaftar (id Supabase Auth).
   * Kosong berarti resep redaksi/katalog. Resep pengguna tayang langsung,
   * tetapi hanya pemiliknya (atau admin) yang boleh mengubah/menghapusnya.
   */
  ownerId: uuid("owner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("cms_recipes_slug_unique").on(table.slug),
  index("cms_recipes_owner_idx").on(table.ownerId),
  index("cms_recipes_status_updated_idx").on(table.status, table.updatedAt),
]);

export const cmsReviews = pgTable("cms_reviews", {
  id: serial("id").primaryKey(),
  recipeSlug: varchar("recipe_slug", { length: 180 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  location: varchar("location", { length: 180 }).notNull(),
  rating: integer("rating").notNull(),
  weather: varchar("weather", { length: 30 }).notNull(),
  water: varchar("water", { length: 30 }).notNull(),
  /** Tipe perairan yang dipakai pengirim: "Kolam", "Sungai", "Danau" (opsional). */
  waterBody: varchar("water_body", { length: 30 }),
  fishingType: varchar("fishing_type", { length: 30 }).notNull(),
  catchCount: integer("catch_count"),
  /** Durasi sesi mancing dalam menit (0,5–24 jam) — opsional, lihat `@/lib/catch-details`. */
  sessionMinutes: integer("session_minutes"),
  /** Jumlah joran yang dipakai selama sesi (1–10) — opsional. */
  rodCount: integer("rod_count"),
  comment: text("comment").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  /** Alasan ulasan ditahan untuk ditinjau admin (moderasi berbasis risiko). */
  holdReason: varchar("hold_reason", { length: 255 }),
  /**
   * Id perangkat anonim (32 heksadesimal acak) dari token bertanda tangan yang
   * dikirim peramban lewat header `x-review-device`. Bukan identitas orang —
   * hanya penanda peramban agar aturan "satu ulasan per resep per perangkat per
   * 24 jam" bisa ditegakkan (`cms_reviews_device_recipe_created_idx`).
   */
  device: varchar("device", { length: 64 }),
  /** Sidik jari IP pengirim, hanya untuk pembatasan laju per IP. */
  ipHash: varchar("ip_hash", { length: 64 }),
  /** Sidik jari isi kiriman, untuk menolak kiriman ulang/kembar yang sama. */
  payloadHash: varchar("payload_hash", { length: 64 }),
  /**
   * Pengirim terdaftar (id Supabase Auth) bila ulasan dikirim saat masuk.
   * Ulasan anonim tetap boleh; kolom ini hanya menghubungkan ulasan ke
   * halaman akun pengirimnya.
   */
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("cms_reviews_status_created_idx").on(table.status, table.createdAt),
  index("cms_reviews_recipe_idx").on(table.recipeSlug),
  index("cms_reviews_device_recipe_created_idx").on(table.device, table.recipeSlug, table.createdAt),
  index("cms_reviews_ip_created_idx").on(table.ipHash, table.createdAt),
]);

/**
 * Laporan pengunjung terhadap ulasan yang sudah tampil publik. Satu laporan
 * per perangkat per ulasan; laporan terbuka ditinjau admin di Studio →
 * Moderasi Ulasan, dan tiga pelapor berbeda menahan ulasan itu otomatis.
 */
export const cmsReviewReports = pgTable("cms_review_reports", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  /** Alasan pilihan pelapor: spam | kasar | tidak-relevan | lainnya. */
  reason: varchar("reason", { length: 30 }).notNull(),
  /** Id perangkat anonim pelapor (token yang sama dengan pengiriman ulasan). */
  device: varchar("device", { length: 64 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  /** open = menunggu tindak lanjut; selesai = sudah ditindak; diabaikan = ditutup tanpa tindakan. */
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("cms_review_reports_review_device_unique").on(table.reviewId, table.device),
  index("cms_review_reports_review_idx").on(table.reviewId),
  index("cms_review_reports_status_idx").on(table.status),
]);

/**
 * Resep favorit milik pengguna terdaftar. Favorit pengunjung anonim tetap
 * disimpan lokal di perangkat (localStorage); saat masuk, keduanya digabung
 * dan tabel ini menjadi sumber yang tersinkron antarperangkat.
 */
export const userFavorites = pgTable("user_favorites", {
  userId: uuid("user_id").notNull(),
  recipeSlug: varchar("recipe_slug", { length: 180 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_favorites_user_slug_unique").on(table.userId, table.recipeSlug),
  index("user_favorites_user_idx").on(table.userId),
]);

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 40 }).notNull().default("page_view"),
  path: varchar("path", { length: 500 }).notNull(),
  entitySlug: varchar("entity_slug", { length: 180 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("analytics_events_created_idx").on(table.createdAt),
  index("analytics_events_path_created_idx").on(table.path, table.createdAt),
]);

/**
 * Berkas gambar yang diunggah dari dashboard (logo situs, poster popup).
 * Disimpan di database sebagai base64 karena proyek ini tidak memakai object
 * storage; dilayani kembali lewat `/api/media/[key]`. `key` sengaja pendek dan
 * tetap (mis. `logo`, `popup-mobile`) supaya alamatnya tidak berubah saat
 * gambar diganti.
 */
export const cmsMedia = pgTable("cms_media", {
  key: varchar("key", { length: 60 }).primaryKey(),
  mimeType: varchar("mime_type", { length: 60 }).notNull(),
  data: text("data").notNull(),
  byteSize: integer("byte_size").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Pengaturan tampilan situs dalam bentuk JSON per kunci. Kunci yang dipakai
 * saat ini: `appearance` (logo & popup sambutan). Baris dibuat saat pertama
 * kali disimpan dari dashboard; bila belum ada, aplikasi memakai nilai bawaan.
 */
export const cmsSettings = pgTable("cms_settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Akun admin tambahan dashboard (Task 114) dengan username + password sendiri
 * dan peran siap pakai. Admin utama dari environment (`ADMIN_PASSWORD`) tidak
 * disimpan di sini dan tetap menjadi cadangan tertinggi. `sessionVersion`
 * dinaikkan setiap kali peran/password/status berubah supaya sesi lama akun
 * tersebut langsung gugur.
 */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).$type<AdminRole>().notNull().default("hanya_lihat"),
  active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1),
  createdBy: varchar("created_by", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
