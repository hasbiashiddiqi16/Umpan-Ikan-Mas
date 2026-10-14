import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  isAdminPasswordConfigured,
  matchesAdminPassword,
  setAdminSessionCookie,
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
  if (typeof password !== "string" || !await matchesAdminPassword(password)) {
    return NextResponse.json(
      { error: "Password tidak sesuai. Silakan coba lagi." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  setAdminSessionCookie(response, request, await createAdminSessionToken());
  return response;
}
