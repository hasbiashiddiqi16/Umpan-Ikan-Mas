import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, count, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviews } from "@/db/schema";
import { REVIEW_DEVICE_HEADER, REVIEW_HONEYPOT_FIELD } from "@/lib/review-guard-constants";

/**
 * Penjagaan ulasan kiriman publik.
 *
 * Situs ini tidak memakai akun, tetapi ulasan tetap dikirim ke server supaya
 * bisa dibaca semua pengunjung. Karena itu setiap kiriman diperiksa dengan
 * cara yang ringan dan tidak menyimpan data pribadi:
 *
 * 1. token perangkat anonim (ditandatangani HMAC, berisi id acak) — dasar aturan
 *    "satu ulasan per resep per perangkat per 24 jam";
 * 2. pembatasan laju per IP (memakai x-real-ip / x-forwarded-for dari proxy);
 * 3. honeypot: kolom tersembunyi yang hanya diisi bot;
 * 4. Cloudflare Turnstile, aktif otomatis bila TURNSTILE_SECRET_KEY disetel;
 * 5. antrean moderasi: ulasan baru selalu berstatus "pending".
 *
 * Yang disimpan di basis data hanya sidik jari HMAC (heksadesimal) — bukan IP
 * maupun token mentah — sehingga tidak ada data pribadi yang tersimpan.
 */

export { REVIEW_DEVICE_HEADER, REVIEW_HONEYPOT_FIELD } from "@/lib/review-guard-constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Batas bawaan; bisa dinaikkan lewat env tanpa mengubah kode. */
const DEFAULT_PER_RECIPE_PER_DEVICE = 1;
const DEFAULT_PER_DEVICE_DAILY = 8;
const DEFAULT_PER_IP_DAILY = 24;

export type ReviewLimits = {
  /** Ulasan maksimum untuk satu resep dari satu perangkat dalam 24 jam. */
  perRecipePerDevice: number;
  /** Ulasan maksimum dari satu perangkat untuk semua resep dalam 24 jam. */
  perDeviceDaily: number;
  /** Ulasan maksimum dari satu IP dalam 24 jam. */
  perIpDaily: number;
};

function limitFromEnv(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw >= 0 ? raw : fallback;
}

export function reviewLimits(): ReviewLimits {
  return {
    perRecipePerDevice: limitFromEnv("REVIEW_PER_RECIPE_PER_DEVICE_LIMIT", DEFAULT_PER_RECIPE_PER_DEVICE),
    perDeviceDaily: limitFromEnv("REVIEW_PER_DEVICE_DAILY_LIMIT", DEFAULT_PER_DEVICE_DAILY),
    perIpDaily: limitFromEnv("REVIEW_IP_DAILY_LIMIT", DEFAULT_PER_IP_DAILY),
  };
}

/** Kunci HMAC: sesi admin dipakai ulang agar tidak ada env tambahan yang wajib. */
function guardSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "umpan-mas-review-guard";
}

/** Sidik jari HMAC-SHA256 (heksadesimal) untuk nilai apa pun. */
export function hashReviewValue(value: string) {
  return createHmac("sha256", guardSecret()).update(value).digest("hex");
}

export type ReviewDevice = { id: string; token: string };

function signatureFor(subject: string) {
  return createHmac("sha256", guardSecret()).update(`review-device:${subject}`).digest("base64url").slice(0, 32);
}

function signatureMatches(expected: string, given: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Menerbitkan token perangkat anonim bertanda tangan (berlaku 400 hari). */
export function issueReviewDeviceToken(previousId?: string | null): ReviewDevice {
  const id = typeof previousId === "string" && /^[a-f0-9]{32}$/.test(previousId) ? previousId : randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 400 * DAY_MS;
  const subject = `${id}.${expiresAt}`;
  const token = `${subject}.${signatureFor(subject)}`;
  return { id, token };
}

/**
 * Membaca token perangkat dari header permintaan. Token yang tidak ada, sudah
 * kedaluwarsa, atau tanda tangannya tidak cocok dianggap tidak ada — jadi klien
 * tidak bisa mengarang id perangkat untuk menghindari aturan 24 jam.
 */
export function readReviewDevice(request: Request): ReviewDevice | null {
  const raw = request.headers.get(REVIEW_DEVICE_HEADER);
  if (!raw || raw.length > 160) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, expiresRaw, signature] = parts;
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || expiresAt <= Date.now()) return null;
  if (!signatureMatches(signatureFor(`${id}.${expiresRaw}`), signature)) return null;
  return { id, token: raw };
}

/** IP pengirim: x-real-ip (edge), lalu entri terakhir x-forwarded-for (proxy terdekat). */
export function reviewClientIp(request: Request) {
  const real = request.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim().slice(0, 100);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").map((part) => part.trim()).filter(Boolean).pop();
    if (last) return last.slice(0, 100);
  }
  const cloudflare = request.headers.get("cf-connecting-ip");
  return cloudflare && cloudflare.trim() ? cloudflare.trim().slice(0, 100) : "tanpa-ip";
}

/** Sidik jari isi kiriman: kiriman ulang yang identik tidak digandakan. */
export function reviewPayloadHash(parts: Array<string | number | null | undefined>) {
  return hashReviewValue(parts.map((part) => (part === null || part === undefined ? "" : String(part))).join("\u0001"));
}

export function isReviewHoneypotFilled(form: Record<string, unknown>) {
  const value = form[REVIEW_HONEYPOT_FIELD];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Apakah Cloudflare Turnstile aktif di lingkungan ini?
 *
 * Butuh kunci rahasia (server) dan kunci situs (peramban) sekaligus. Kalau
 * hanya salah satu yang disetel, penyaring ini dimatikan supaya pengunjung
 * tidak terjebak formulir yang tidak pernah bisa dikirim.
 */
export function isTurnstileConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

/**
 * Memeriksa token Turnstile ke Cloudflare. Bila kuncinya belum disetel (mode
 * ringan tanpa Turnstile), pemeriksaan dilewati sehingga ulasan tetap bisa
 * dikirim. Ini hanya berlaku di server — kunci rahasia tidak pernah dikirim ke
 * peramban; peramban hanya memakai NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */
export async function verifyTurnstileToken(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "tanpa-ip") body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: unknown };
    return result.success === true;
  } catch {
    // Cloudflare tidak bisa dihubungi. Turnstile yang dikonfigurasi berarti
    // pengelola situs memang ingin penyaring ini bekerja, jadi gagal dengan
    // pesan yang jelas alih-alih meloloskan kiriman tanpa diperiksa.
    return false;
  }
}

export type ReviewLimitHit = {
  code: "review-cooldown" | "device-limit" | "ip-limit" | "duplicate";
  status: number;
  error: string;
  retryAfterSeconds?: number;
  existingId?: number;
};

/**
 * Aturan "satu ulasan per resep per perangkat per 24 jam" plus plafon harian
 * per perangkat dan per IP. Ulasan yang ditolak moderator tidak dihitung, jadi
 * pengunjung tetap boleh memperbaiki kirimannya.
 */
export async function checkReviewLimits(options: {
  deviceId: string;
  ipHash: string;
  recipeSlug: string;
  payloadHash: string;
}): Promise<ReviewLimitHit | null> {
  const { deviceId, ipHash, recipeSlug, payloadHash } = options;
  const limits = reviewLimits();
  const since = new Date(Date.now() - DAY_MS);

  const recent = await db
    .select({ id: cmsReviews.id, recipeSlug: cmsReviews.recipeSlug, device: cmsReviews.device, ipHash: cmsReviews.ipHash, payloadHash: cmsReviews.payloadHash, createdAt: cmsReviews.createdAt })
    .from(cmsReviews)
    .where(
      and(
        ne(cmsReviews.status, "rejected"),
        gte(cmsReviews.createdAt, since),
        sql`(${cmsReviews.device} = ${deviceId} or ${cmsReviews.ipHash} = ${ipHash})`,
      ),
    );

  const sameDevice = recent.filter((row) => row.device === deviceId);
  // Kiriman yang persis sama dianggap percobaan ulang, baik dari perangkat yang
  // sama maupun dari jaringan yang sama (mis. setelah data peramban dihapus).
  const exactDuplicate = recent.find((row) => row.payloadHash && row.payloadHash === payloadHash && row.recipeSlug === recipeSlug && (row.device === deviceId || row.ipHash === ipHash));
  if (exactDuplicate) {
    return { code: "duplicate", status: 200, error: "", existingId: exactDuplicate.id };
  }

  const forRecipe = sameDevice.filter((row) => row.recipeSlug === recipeSlug);
  if (limits.perRecipePerDevice > 0 && forRecipe.length >= limits.perRecipePerDevice) {
    const oldest = forRecipe.reduce((acc, row) => (row.createdAt < acc ? row.createdAt : acc), forRecipe[0].createdAt);
    const waitMs = Math.max(DAY_MS - (Date.now() - new Date(oldest).getTime()), 60_000);
    return {
      code: "review-cooldown",
      status: 429,
      error: "Kamu sudah mengirim ulasan untuk resep ini dalam 24 jam terakhir. Coba lagi besok, ya.",
      retryAfterSeconds: Math.ceil(waitMs / 1000),
    };
  }
  if (limits.perDeviceDaily > 0 && sameDevice.length >= limits.perDeviceDaily) {
    return {
      code: "device-limit",
      status: 429,
      error: "Batas kiriman ulasan harian dari perangkat ini sudah tercapai. Coba lagi besok.",
      retryAfterSeconds: Math.ceil(DAY_MS / 1000),
    };
  }
  if (limits.perIpDaily > 0) {
    const [{ total }] = await db.select({ total: count() }).from(cmsReviews).where(and(ne(cmsReviews.status, "rejected"), gte(cmsReviews.createdAt, since), eq(cmsReviews.ipHash, ipHash)));
    if (Number(total) >= limits.perIpDaily) {
      return {
        code: "ip-limit",
        status: 429,
        error: "Terlalu banyak ulasan terkirim dari jaringan ini hari ini. Coba lagi besok.",
        retryAfterSeconds: Math.ceil(DAY_MS / 1000),
      };
    }
  }
  return null;
}

/**
 * Menandai ulasan mana (dari daftar id yang dipegang peramban) yang sudah
 * diputuskan moderator. Hanya baris milik perangkat peminta yang diperiksa,
 * supaya peramban tidak bisa membaca status ulasan orang lain.
 */
export async function reviewStatusesForDevice(ids: number[], deviceId: string) {
  if (!ids.length) return [] as Array<{ id: number; status: string }>;
  const rows = await db
    .select({ id: cmsReviews.id, status: cmsReviews.status })
    .from(cmsReviews)
    .where(and(inArray(cmsReviews.id, ids), eq(cmsReviews.device, deviceId)));
  return rows;
}
