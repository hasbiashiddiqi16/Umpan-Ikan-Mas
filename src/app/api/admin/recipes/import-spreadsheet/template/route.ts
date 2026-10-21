import { requireAdminApi } from "@/lib/admin-auth";
import { buildRecipeTemplateWorkbook } from "@/lib/recipe-spreadsheet";

export const dynamic = "force-dynamic";

/**
 * Unduh template Excel impor resep: lembar "Resep" hanya berisi judul kolom
 * dan lembar "Petunjuk" berisi cara mengisi beserta daftar nilai yang sah
 * untuk setiap kolom pilihan (diambil dari daftar resmi yang sama dengan
 * formulir, jadi selalu mutakhir).
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
