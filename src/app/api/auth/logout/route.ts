import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminCookieOptions } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  // Atribut cookie harus sama persis dengan saat disimpan agar bisa dihapus.
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    ...adminCookieOptions(request),
    maxAge: 0,
  });
  return response;
}
