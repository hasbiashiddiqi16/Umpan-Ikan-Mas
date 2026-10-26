import { NextResponse } from "next/server";
import {
  PRIMARY_ADMIN_IDENTITY,
  createAdminSessionToken,
  isAdminPasswordConfigured,
  matchesAdminPassword,
  setAdminSessionCookie,
} from "@/lib/admin-auth";
import { findAdminUserForLogin, normalizeAdminUsername } from "@/lib/admin-users-server";
import { PRIMARY_ADMIN_USERNAME, type AdminIdentity } from "@/lib/admin-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function galat(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return galat("Login admin belum dikonfigurasi. Tambahkan ADMIN_PASSWORD di environment server.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return galat("Permintaan login tidak valid.", 400);
  }

  const record = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
  const password = typeof record.password === "string" ? record.password : "";
  if (!password) return galat("Username atau password tidak sesuai. Silakan coba lagi.", 401);

  // Username kosong atau "admin" berarti admin utama (password environment /
  // password dashboard yang diganti). Username lain berarti akun admin
  // tambahan yang dibuat dari dashboard (Task 114).
  const usernameRaw = typeof record.username === "string" ? record.username.trim().toLowerCase() : "";
  let identity: AdminIdentity | null = null;
  if (!usernameRaw || usernameRaw === PRIMARY_ADMIN_USERNAME) {
    if (await matchesAdminPassword(password)) identity = PRIMARY_ADMIN_IDENTITY;
  } else {
    const username = normalizeAdminUsername(usernameRaw);
    const user = username ? await findAdminUserForLogin(username, password) : null;
    if (user) {
      identity = { sub: user.username, role: user.role, sv: user.sessionVersion, primary: false };
    }
  }

  // Pesan dibuat umum agar tidak membocorkan username mana yang terdaftar.
  if (!identity) return galat("Username atau password tidak sesuai. Silakan coba lagi.", 401);

  const response = NextResponse.json(
    { ok: true, username: identity.sub, role: identity.role },
    { headers: { "Cache-Control": "no-store" } },
  );
  setAdminSessionCookie(response, request, await createAdminSessionToken(identity));
  return response;
}
