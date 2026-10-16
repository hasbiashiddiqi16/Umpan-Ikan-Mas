import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { userFavorites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-user";
import { databaseErrorResponse } from "@/lib/database-status";

export const dynamic = "force-dynamic";

const belumMasuk = () => Response.json({ error: "Masuk dulu untuk melanjutkan." }, { status: 401 });

/** Daftar slug favorit milik pengguna (terbaru dulu). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return belumMasuk();
  try {
    const rows = await db.select({ slug: userFavorites.recipeSlug }).from(userFavorites).where(eq(userFavorites.userId, user.id)).orderBy(desc(userFavorites.createdAt));
    return Response.json({ slugs: rows.map((row) => row.slug) });
  } catch (error) {
    return databaseErrorResponse(error, "Favorit belum dapat dimuat.");
  }
}

/** Ganti seluruh daftar favorit (dipakai sinkronisasi gabungan lokal+akun). */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return belumMasuk();
  try {
    const body: unknown = await request.json();
    const mentah = body && typeof body === "object" && Array.isArray((body as { slugs?: unknown }).slugs) ? (body as { slugs: unknown[] }).slugs : [];
    const slugs = [...new Set(mentah.filter((item): item is string => typeof item === "string" && /^[a-z0-9-]{2,180}$/.test(item)))].slice(0, 300);
    await db.delete(userFavorites).where(eq(userFavorites.userId, user.id));
    if (slugs.length) {
      await db.insert(userFavorites).values(slugs.map((recipeSlug) => ({ userId: user.id, recipeSlug })));
    }
    return Response.json({ slugs });
  } catch (error) {
    return databaseErrorResponse(error, "Favorit gagal disimpan.");
  }
}
