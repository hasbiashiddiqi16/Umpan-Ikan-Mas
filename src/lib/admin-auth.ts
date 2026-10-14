import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { checkCustomPassword, readAdminPasswordState } from "@/lib/admin-password-server";

export const ADMIN_SESSION_COOKIE = "umpan_mas_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || getAdminPassword();
}

function safeStringEqual(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function isAdminPasswordConfigured() {
  return getAdminPassword().length > 0;
}

/**
 * Memeriksa password yang diketik di halaman masuk.
 *
 * Bila password pernah diganti dari dashboard, hanya password barulah yang
 * berlaku — password environment tidak lagi bisa dipakai (kalau tidak, mengganti
 * password tidak ada gunanya). Selama belum pernah diganti, password environment
 * yang berlaku. Saat basis data bermasalah, password environment tetap diterima
 * supaya pemilik situs tidak terkunci di luar dashboard.
 */
export async function matchesAdminPassword(candidate: string) {
  const custom = await checkCustomPassword(candidate);
  if (custom === "match") return true;
  if (custom === "mismatch") return false;

  const expected = getAdminPassword();
  return expected.length > 0 && safeStringEqual(candidate, expected);
}

export async function createAdminSessionToken() {
  const secret = getSessionSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD must be configured before creating an admin session.");

  // Nomor versi password ikut ditanamkan: sesi yang dibuat sebelum password
  // diganti membawa nomor lama dan otomatis ditolak.
  const { generation } = await readAdminPasswordState();
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
    gen: generation,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function verifyAdminSessionToken(token?: string) {
  if (!token || token.length > 512) return false;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;

  const secret = getSessionSecret();
  if (!secret) return false;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  const suppliedSignature = Buffer.from(signature, "base64url");
  if (expectedSignature.length !== suppliedSignature.length || !timingSafeEqual(expectedSignature, suppliedSignature)) return false;

  let parsed: { expiresAt?: unknown; gen?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as typeof parsed;
  } catch {
    return false;
  }

  if (typeof parsed.expiresAt !== "number"
    || !Number.isSafeInteger(parsed.expiresAt)
    || parsed.expiresAt <= Math.floor(Date.now() / 1000)) return false;

  // Cookie lama (dibuat sebelum fitur ganti password) tidak membawa nomor versi;
  // dianggap versi 0 supaya sesi yang masih berjalan tidak ikut diputus.
  const generation = typeof parsed.gen === "number" && Number.isSafeInteger(parsed.gen) && parsed.gen >= 0
    ? parsed.gen
    : 0;
  const { generation: current } = await readAdminPasswordState();
  return generation === current;
}

/**
 * Menyimpan cookie sesi admin pada respons. Dipakai saat login dan saat password
 * diganti (agar perangkat yang mengganti tidak ikut terkeluar).
 */
export function setAdminSessionCookie(response: NextResponse, request: Request, token: string) {
  // Cookie Secure hanya saat permintaan memang datang lewat HTTPS (langsung
  // atau lewat proxy seperti Netlify). Dipaksakan di HTTP membuat browser
  // menolak menyimpan cookie sesi sehingga pengguna "sudah login tapi tetap
  // tidak bisa masuk dashboard".
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: requestIsSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/**
 * Apakah permintaan ini datang lewat HTTPS (langsung atau lewat proxy)?
 * Cookie sesi memakai atribut `Secure` hanya pada situasi ini:
 * - di HTTPS, cookie wajib Secure agar tidak bocor lewat jaringan;
 * - di HTTP (dev/preview), cookie tanpa Secure tetap bisa disimpan dan
 *   dihapus browser, sehingga login & logout tetap berfungsi.
 */
export function requestIsSecure(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "";
  return request.url.startsWith("https:")
    || forwardedProto.split(",").some((proto) => proto.trim() === "https");
}

export async function requireAdminApi() {
  if (await isAdminAuthenticated()) return null;
  return Response.json(
    { error: "Sesi admin tidak valid. Silakan masuk kembali." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
