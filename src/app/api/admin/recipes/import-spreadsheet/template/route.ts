import { requireAdminApi } from "@/lib/admin-auth";
import { buildRecipeTemplateWorkbook } from "@/lib/recipe-spreadsheet";

export const dynamic = "force-dynamic";

/**
 * Unduh template Excel impor resep: lembar "Resep" berisi judul kolom +
 * satu baris contoh pada kolom wajib saja (kolom opsional sengaja kosong),
 * dan lembar "Petunjuk" berisi panduan serta daftar nilai resmi yang sah.
 */
export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const buffer = await buildRecipeTemplateWorkbook();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-impor-resep.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
