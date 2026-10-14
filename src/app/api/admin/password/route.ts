import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  isAdminPasswordConfigured,
  matchesAdminPassword,
  requireAdminApi,
  setAdminSessionCookie,
} from "@/lib/admin-auth";
import { ADMIN_PASSWORD_MAX_LENGTH, ADMIN_PASSWORD_MIN_LENGTH, validatePasswordChange } from "@/lib/admin-password";
import { readAdminPasswordState, resetAdminPassword, saveAdminPassword, type AdminPasswordState } from "@/lib/admin-password-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Keadaan password dashboard, untuk ditampilkan di kartu Keamanan. */
export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const state = await readAdminPasswordState();
  return NextResponse.json({
    ...state,
    envConfigured: isAdminPasswordConfigured(),
    minLength: ADMIN_PASSWORD_MIN_LENGTH,
    maxLength: ADMIN_PASSWORD_MAX_LENGTH,
  }, { headers: noStore });
}

/** Mengganti password dashboard. */
export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400, headers: noStore });
  }

  const parsed = validatePasswordChange(body);
  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error ?? "Isian ganti password belum lengkap." }, { status: 400, headers: noStore });
  }

  if (!await matchesAdminPassword(parsed.data.current)) {
    return NextResponse.json({ error: "Password saat ini tidak sesuai." }, { status: 400, headers: noStore });
  }

  let state: AdminPasswordState;
  try {
    state = await saveAdminPassword(parsed.data.next);
  } catch {
    return NextResponse.json(
      { error: "Password baru gagal disimpan. Pastikan basis data tersambung, lalu coba lagi." },
      { status: 500, headers: noStore },
    );
  }

  const response = NextResponse.json({
    ok: true,
    notice: "Password dashboard diperbarui. Sesi di perangkat lain otomatis berakhir.",
    state: { ...state, envConfigured: isAdminPasswordConfigured() },
  }, { headers: noStore });

  // Perangkat yang mengganti password tetap masuk: cookie barunya sudah membawa
  // nomor versi terbaru.
  try {
    setAdminSessionCookie(response, request, await createAdminSessionToken());
  } catch {
    // Tanpa ADMIN_PASSWORD, cookie sesi tidak bisa dibuat; biarkan perubahan
    // password tetap tersimpan dan pengguna masuk kembali lewat /login.
  }
  return response;
}

/** Mengembalikan password dashboard ke `ADMIN_PASSWORD` dari environment. */
export async function DELETE(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  let state: AdminPasswordState;
  try {
    state = await resetAdminPassword();
  } catch {
    return NextResponse.json(
      { error: "Password bawaan gagal dipakai kembali. Pastikan basis data tersambung, lalu coba lagi." },
      { status: 500, headers: noStore },
    );
  }

  const response = NextResponse.json({
    ok: true,
    notice: "Password dashboard kembali memakai ADMIN_PASSWORD dari server. Sesi di perangkat lain otomatis berakhir.",
    state: { ...state, envConfigured: isAdminPasswordConfigured() },
  }, { headers: noStore });

  try {
    setAdminSessionCookie(response, request, await createAdminSessionToken());
  } catch {
    // Sama seperti di atas: perubahan tetap tersimpan.
  }
  return response;
}
