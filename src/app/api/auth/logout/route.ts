import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, requestIsSecure } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  // Atribut `Secure` harus sama persis dengan saat cookie disimpan,
  // jika berbeda browser tidak akan menghapus cookie sesi.
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: requestIsSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
