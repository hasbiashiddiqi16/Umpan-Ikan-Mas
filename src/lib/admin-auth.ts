import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { checkCustomPassword, readAdminPasswordState } from "@/lib/admin-password-server";
import { readAdminUserSessionState } from "@/lib/admin-users-server";
import {
  PRIMARY_ADMIN_USERNAME,
  ROLE_LABELS,
  canRole,
  isAdminRole,
  type AdminCapability,
  type AdminIdentity,
} from "@/lib/admin-roles";

export const ADMIN_SESSION_COOKIE = "umpan_mas_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/** Identitas admin utama dari environment: akses tertinggi, tanpa baris basis data. */
export const PRIMARY_ADMIN_IDENTITY: AdminIdentity = {
  sub: PRIMARY_ADMIN_USERNAME,
  role: "pemilik",
  sv: 0,
  primary: true,
};

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
 * Memeriksa password admin utama yang diketik di halaman masuk.
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

export async function createAdminSessionToken(identity: AdminIdentity = PRIMARY_ADMIN_IDENTITY) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD must be configured before creating an admin session.");

  // Nomor versi password ikut ditanamkan: sesi yang dibuat sebelum password
  // diganti membawa nomor lama dan otomatis ditolak. Identitas + peran +
  // versi sesi akun tambahan ikut ditanamkan (Task 114) supaya setiap route
  // API dapat menegakkan batasan akses per peran.
  const { generation } = await readAdminPasswordState();
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
    gen: generation,
    sub: identity.sub,
    role: identity.role,
    sv: identity.sv,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

type AdminSessionPayload = { expiresAt: number; generation: number; identity: AdminIdentity };

/**
 * Membaca isi cookie sesi **tanpa menyentuh basis data**: hanya memeriksa bentuk,
 * tanda tangan HMAC, dan masa berlaku. Dipakai gerbang cepat di `src/proxy.ts`,
 * yang berjalan pada setiap permintaan ke area admin.
 */
function decodeAdminSessionToken(token?: string): AdminSessionPayload | null {
  if (!token || token.length > 1024) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const secret = getSessionSecret();
  if (!secret) return null;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  const suppliedSignature = Buffer.from(signature, "base64url");
  if (expectedSignature.length !== suppliedSignature.length || !timingSafeEqual(expectedSignature, suppliedSignature)) return null;

  let parsed: { expiresAt?: unknown; gen?: unknown; sub?: unknown; role?: unknown; sv?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as typeof parsed;
  } catch {
    return null;
  }

  if (typeof parsed.expiresAt !== "number"
    || !Number.isSafeInteger(parsed.expiresAt)
    || parsed.expiresAt <= Math.floor(Date.now() / 1000)) return null;

  // Cookie lama (dibuat sebelum fitur ganti password) tidak membawa nomor versi;
  // dianggap versi 0 supaya sesi yang masih berjalan tidak ikut diputus.
  const generation = typeof parsed.gen === "number" && Number.isSafeInteger(parsed.gen) && parsed.gen >= 0
    ? parsed.gen
    : 0;

  // Cookie lama (dibuat sebelum multi-admin) tidak membawa identitas; dianggap
  // sesi admin utama supaya sesi yang sedang berjalan tidak ikut diputus.
  let identity: AdminIdentity = PRIMARY_ADMIN_IDENTITY;
  if (parsed.sub !== undefined) {
    if (typeof parsed.sub !== "string" || !parsed.sub || !isAdminRole(parsed.role)) return null;
    const sv = typeof parsed.sv === "number" && Number.isSafeInteger(parsed.sv) && parsed.sv >= 0
      ? parsed.sv
      : 0;
    identity = {
      sub: parsed.sub,
      role: parsed.role,
      sv,
      primary: parsed.sub === PRIMARY_ADMIN_USERNAME,
    };
  }
  return { expiresAt: parsed.expiresAt, generation, identity };
}

/**
 * Pemeriksaan ringan untuk proxy/middleware: tanda tangan sah dan sesi belum
 * kedaluwarsa. Tidak membaca basis data, jadi aman dipanggil di setiap permintaan.
 * Pemeriksaan penuh tetap dilakukan `verifyAdminSessionToken()` saat halaman dirender.
 */
export function verifyAdminSessionSignature(token?: string): boolean {
  return decodeAdminSessionToken(token) !== null;
}

/**
 * Verifikasi penuh sesi: tanda tangan, masa berlaku, versi password, dan —
 * untuk akun tambahan — akun masih ada, masih aktif, dan versi sesinya belum
 * naik (peran/password/status berubah menaikkan versi sehingga sesi lama
 * gugur). Mengembalikan identitas sesi, atau `null` bila tidak sah.
 */
export async function verifyAdminSessionIdentity(token?: string): Promise<AdminIdentity | null> {
  const session = decodeAdminSessionToken(token);
  if (!session) return null;

  // Password yang sudah diganti menaikkan nomor versi, sehingga sesi lama ditolak.
  const { generation: current } = await readAdminPasswordState();
  if (session.generation !== current) return null;

  if (session.identity.primary) return session.identity;

  const state = await readAdminUserSessionState(session.identity.sub);
  if (!state || state.sessionVersion !== session.identity.sv) return null;
  // Peran dibaca segar dari basis data; versi sesi yang naik tetap menggugurkan
  // token lama, jadi peran di sini selalu selaras dengan token yang sah.
  return { ...session.identity, role: state.role };
}

export async function verifyAdminSessionToken(token?: string) {
  return (await verifyAdminSessionIdentity(token)) !== null;
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

/** Identitas admin yang sedang masuk, atau `null` bila belum/tidak sah. */
export async function getAdminSession(): Promise<AdminIdentity | null> {
  const cookieStore = await cookies();
  return verifyAdminSessionIdentity(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/**
 * Pemeriksaan penuh (termasuk versi password) untuk pemakaian di server:
 * layout dashboard, route handler, dan halaman masuk. Ini pemeriksaan yang
 * menentukan; gerbang di proxy hanya menyaring permintaan tanpa sesi sah.
 */
export async function isAdminAuthenticated() {
  return (await getAdminSession()) !== null;
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

function noStoreJson(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Gerbang route API admin. Tanpa argumen: cukup sesi sah (dipakai permintaan
 * baca). Dengan kapabilitas: peran sesi wajib memilikinya — inilah penegakan
 * batasan akses yang menentukan di server; menyembunyikan menu di klien hanya
 * soal tampilan. Mengembalikan respons galat, atau `null` bila boleh lanjut.
 */
export async function requireAdminApi(capability?: AdminCapability) {
  const session = await getAdminSession();
  if (!session) {
    return noStoreJson({ error: "Sesi admin tidak valid. Silakan masuk kembali." }, 401);
  }
  if (capability && !canRole(session.role, capability)) {
    return noStoreJson(
      { error: `Peran Anda (${ROLE_LABELS[session.role]}) tidak memiliki akses untuk tindakan ini.` },
      403,
    );
  }
  return null;
}
