import { validatePopupSettings } from "@/lib/appearance";
import { readAppearance, savePopupSettings } from "@/lib/appearance-server";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Keadaan tampilan saat ini untuk editor dashboard (tanpa cache). */
export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const appearance = await readAppearance();
  return Response.json(appearance, { headers: { "Cache-Control": "no-store" } });
}

/** Menyimpan pengaturan popup sambutan. */
export async function PUT(request: Request) {
  const unauthorized = await requireAdminApi("tampilan");
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await request.json();
    const parsed = validatePopupSettings(body);
    if (!parsed.data) return Response.json({ error: parsed.error ?? "Pengaturan popup tidak valid." }, { status: 400 });
    await savePopupSettings(parsed.data);
    const appearance = await readAppearance();
    return Response.json({ appearance, notice: "Pengaturan popup disimpan." });
  } catch {
    return Response.json({ error: "Pengaturan popup gagal disimpan. Coba lagi." }, { status: 500 });
  }
}
