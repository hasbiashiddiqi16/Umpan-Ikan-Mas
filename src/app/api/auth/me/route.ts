import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { ROLE_LABELS } from "@/lib/admin-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Identitas admin yang sedang masuk; dipakai bilah sisi dashboard untuk menyaring menu per peran. */
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sesi admin tidak valid. Silakan masuk kembali." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    {
      username: session.sub,
      role: session.role,
      roleLabel: ROLE_LABELS[session.role],
      primary: session.primary,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
