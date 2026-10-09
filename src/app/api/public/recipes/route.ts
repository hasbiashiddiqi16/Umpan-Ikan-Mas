import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows, managedSlugs] = await Promise.all([
      db.select().from(cmsRecipes).where(eq(cmsRecipes.status, "published")).orderBy(desc(cmsRecipes.updatedAt)),
      db.select({ slug: cmsRecipes.slug }).from(cmsRecipes),
    ]);
    return Response.json({ recipes: rows, shadowedSlugs: managedSlugs.map((row) => row.slug) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Katalog tambahan sedang tidak tersedia.", recipes: [] }, { status: 503 });
  }
}
