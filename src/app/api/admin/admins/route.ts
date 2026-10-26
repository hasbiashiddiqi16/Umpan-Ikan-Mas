import { NextResponse } from "next/server";
import { getAdminSession, requireAdminApi } from "@/lib/admin-auth";
import { createAdminUser, listAdminUsers } from "@/lib/admin-users-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * Kelola akun admin tambahan (Task 114). Hanya peran Pemilik (kapabilitas
 * `keamanan`) — admin utama dari environment tidak tercantum di sini dan tidak
 * bisa dihapus/dinonaktifkan dari dashboard.
 */
export async function GET() {
  const unauthorized = await requireAdminApi("keamanan");
  if (unauthorized) return unauthorized;

  try {
    const admins = await listAdminUsers();
    return NextResponse.json({ admins }, { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "Daftar admin gagal dimuat. Pastikan basis data tersambung, lalu coba lagi." },
      { status: 500, headers: noStore },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi("keamanan");
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400, headers: noStore });
  }
  const record = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};

  const session = await getAdminSession();
  try {
    const result = await createAdminUser(
      { username: record.username, name: record.name, password: record.password, role: record.role },
      session?.sub ?? "admin",
    );
    if (!result.user) {
      return NextResponse.json({ error: result.error ?? "Akun admin gagal dibuat." }, { status: 400, headers: noStore });
    }
    return NextResponse.json(
      { ok: true, notice: `Akun admin "${result.user.username}" dibuat.`, admin: result.user },
      { status: 201, headers: noStore },
    );
  } catch {
    return NextResponse.json(
      { error: "Akun admin gagal dibuat. Pastikan basis data tersambung, lalu coba lagi." },
      { status: 500, headers: noStore },
    );
  }
}
