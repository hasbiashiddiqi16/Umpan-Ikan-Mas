import { NextResponse } from "next/server";
import { getAdminSession, requireAdminApi } from "@/lib/admin-auth";
import { deleteAdminUser, updateAdminUser } from "@/lib/admin-users-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

type RouteContext = { params: Promise<{ id: string }> };

/** Ubah nama/peran/status aktif/password akun admin tambahan (hanya Pemilik). */
export async function PATCH(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const session = await getAdminSession();
  try {
    const result = await updateAdminUser(
      id,
      { name: record.name, role: record.role, active: record.active, password: record.password },
      session?.sub ?? "admin",
    );
    if (!result.user) {
      const notFound = (result.error ?? "").includes("tidak ditemukan");
      return NextResponse.json(
        { error: result.error ?? "Akun admin gagal diperbarui." },
        { status: notFound ? 404 : 400, headers: noStore },
      );
    }
    return NextResponse.json(
      { ok: true, notice: `Akun admin "${result.user.username}" diperbarui. Sesi lamanya otomatis berakhir.`, admin: result.user },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      { error: "Akun admin gagal diperbarui. Pastikan basis data tersambung, lalu coba lagi." },
      { status: 500, headers: noStore },
    );
  }
}

/** Hapus akun admin tambahan (hanya Pemilik; tidak bisa menghapus diri sendiri). */
export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi("keamanan");
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const session = await getAdminSession();
  try {
    const result = await deleteAdminUser(id, session?.sub ?? "admin");
    if (result.error) {
      const notFound = result.error.includes("tidak ditemukan");
      return NextResponse.json({ error: result.error }, { status: notFound ? 404 : 400, headers: noStore });
    }
    return NextResponse.json({ ok: true, notice: "Akun admin dihapus." }, { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "Akun admin gagal dihapus. Pastikan basis data tersambung, lalu coba lagi." },
      { status: 500, headers: noStore },
    );
  }
}
