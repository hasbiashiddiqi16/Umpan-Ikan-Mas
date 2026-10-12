import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isAdminPasswordConfigured,
  matchesAdminPassword,
  requestIsSecure,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: "Login admin belum dikonfigurasi. Tambahkan ADMIN_PASSWORD di environment server." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 400 });
  }

  const password = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).password
    : undefined;
  if (typeof password !== "string" || !matchesAdminPassword(password)) {
    return NextResponse.json(
      { error: "Password tidak sesuai. Silakan coba lagi." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Cookie Secure hanya saat permintaan memang datang lewat HTTPS (langsung
  // atau lewat proxy seperti Netlify). Dipaksakan di HTTP membuat browser
  // menolak menyimpan cookie sesi sehingga pengguna "sudah login tapi tetap
  // tidak bisa masuk dashboard".
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionToken(),
    httpOnly: true,
    secure: requestIsSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
