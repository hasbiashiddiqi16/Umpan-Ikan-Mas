import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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

export function matchesAdminPassword(candidate: string) {
  const expected = getAdminPassword();
  return expected.length > 0 && safeStringEqual(candidate, expected);
}

export function createAdminSessionToken() {
  const secret = getSessionSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD must be configured before creating an admin session.");

  const payload = Buffer.from(JSON.stringify({
    expiresAt: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token?: string) {
  if (!token || token.length > 512) return false;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;

  const secret = getSessionSecret();
  if (!secret) return false;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  const suppliedSignature = Buffer.from(signature, "base64url");
  if (expectedSignature.length !== suppliedSignature.length || !timingSafeEqual(expectedSignature, suppliedSignature)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { expiresAt?: unknown };
    return typeof parsed.expiresAt === "number"
      && Number.isSafeInteger(parsed.expiresAt)
      && parsed.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminApi() {
  if (await isAdminAuthenticated()) return null;
  return Response.json(
    { error: "Sesi admin tidak valid. Silakan masuk kembali." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
