import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { normalizeCmsRecipeRecord } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows, managedSlugs] = await Promise.all([
      db.select().from(cmsRecipes).where(eq(cmsRecipes.status, "published")).orderBy(desc(cmsRecipes.updatedAt)),
      db.select({ slug: cmsRecipes.slug }).from(cmsRecipes),
    ]);
    // Baris lama bisa masih memakai sebutan "Galat"; dikirim sebagai "Galatama".
    // ID pemilik akun tidak ikut dikirim ke publik; etalase komunitas cukup
    // menerima penanda dariKomunitas, nama penulis, dan tanggal bagikan.
    return Response.json({ recipes: rows.map((row) => {
      const { ownerId, ...publik } = normalizeCmsRecipeRecord(row);
      return { ...publik, dariKomunitas: Boolean(ownerId), tanggalBagikan: row.createdAt };
    }), shadowedSlugs: managedSlugs.map((row) => row.slug) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Katalog tambahan sedang tidak tersedia.", recipes: [] }, { status: 503 });
  }
}
