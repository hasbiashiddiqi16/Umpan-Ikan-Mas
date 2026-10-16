import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes, cmsReviews, userFavorites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

/**
 * Profil ringkas pengguna yang masuk + jumlah isi akunnya. Pengunjung
 * anonim menerima `{ user: null }` (bukan 401) supaya navbar dan
 * formulir bisa menyesuaikan tampilan tanpa galat.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null });
  try {
    const [resep, ulasan, favorit] = await Promise.all([
      db.select({ total: count() }).from(cmsRecipes).where(eq(cmsRecipes.ownerId, user.id)),
      db.select({ total: count() }).from(cmsReviews).where(eq(cmsReviews.userId, user.id)),
      db.select({ total: count() }).from(userFavorites).where(eq(userFavorites.userId, user.id)),
    ]);
    return Response.json({
      user,
      counts: {
        recipes: Number(resep[0]?.total ?? 0),
        reviews: Number(ulasan[0]?.total ?? 0),
        favorites: Number(favorit[0]?.total ?? 0),
      },
    });
  } catch {
    return Response.json({ user, counts: { recipes: 0, reviews: 0, favorites: 0 } });
  }
}
