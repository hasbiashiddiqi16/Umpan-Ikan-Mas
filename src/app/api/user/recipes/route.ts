import { and, count, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-user";
import { normalizeCmsRecipeRecord, validateCmsRecipeInput } from "@/lib/cms";
import { databaseErrorResponse } from "@/lib/database-status";
import { revalidateRecipePages } from "@/lib/revalidate-recipes";
import { hargaAcuanDariLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Batas wajar berbagi resep per pengguna per hari (anti-spam). */
const BATAS_RESEP_PER_HARI = 10;

const belumMasuk = () => Response.json({ error: "Masuk dulu untuk melanjutkan." }, { status: 401 });

/** Daftar resep milik pengguna yang masuk. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return belumMasuk();
  try {
    const rows = await db.select().from(cmsRecipes).where(eq(cmsRecipes.ownerId, user.id)).orderBy(desc(cmsRecipes.updatedAt));
    return Response.json({ recipes: rows.map(normalizeCmsRecipeRecord) });
  } catch (error) {
    return databaseErrorResponse(error, "Resep kamu belum dapat dimuat.");
  }
}

/**
 * Bagikan resep baru. Sesuai keputusan produk, resep pengguna langsung
 * tayang (status published) — tetapi tetap melewati validasi yang sama
 * dengan dashboard admin, penulisnya nama akun, dan slug dibuat unik.
 * Admin tetap bisa mengarsipkan resep bermasalah dari dashboard.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return belumMasuk();
  try {
    const sejak = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [jumlah] = await db
      .select({ total: count() })
      .from(cmsRecipes)
      .where(and(eq(cmsRecipes.ownerId, user.id), gt(cmsRecipes.createdAt, sejak)));
    if (Number(jumlah?.total ?? 0) >= BATAS_RESEP_PER_HARI) {
      return Response.json({ error: "Kamu sudah membagikan banyak resep hari ini. Coba lagi besok ya." }, { status: 429 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return Response.json({ error: "Data resep tidak valid." }, { status: 400 });
    const mentah = body as Record<string, unknown>;
    const calon: Record<string, unknown> = {
      ...mentah,
      status: "published",
      author: user.name,
      priceValue: Number.isFinite(Number(mentah.priceValue)) && mentah.priceValue !== undefined && mentah.priceValue !== null
        ? Number(mentah.priceValue)
        : hargaAcuanDariLabel(typeof mentah.price === "string" ? mentah.price : ""),
    };
    const parsed = validateCmsRecipeInput(calon);
    if (!parsed.data) return Response.json({ error: parsed.error ?? "Data resep tidak valid." }, { status: 400 });

    // Slug harus unik di seluruh katalog (termasuk resep redaksi).
    let slug = parsed.data.slug;
    for (let percobaan = 2; percobaan <= 50; percobaan++) {
      const [ada] = await db.select({ id: cmsRecipes.id }).from(cmsRecipes).where(eq(cmsRecipes.slug, slug)).limit(1);
      if (!ada) break;
      slug = `${parsed.data.slug}-${percobaan}`.slice(0, 180);
    }

    const [created] = await db.insert(cmsRecipes).values({ ...parsed.data, slug, ownerId: user.id }).returning();
    revalidateRecipePages([created.slug], Array.isArray(created.provinces) ? created.provinces : []);
    return Response.json({ recipe: normalizeCmsRecipeRecord(created) }, { status: 201 });
  } catch (error) {
    return databaseErrorResponse(error, "Resep gagal dibagikan. Periksa isian lalu coba lagi.");
  }
}
