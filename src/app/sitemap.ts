import type { MetadataRoute } from "next";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { provinces } from "@/data/provinces";
import { absoluteUrl, siteOrigin } from "@/lib/seo";

export const dynamic = "force-dynamic";

const publicPages: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/katalog", changeFrequency: "weekly", priority: 0.9 },
  { path: "/provinsi", changeFrequency: "monthly", priority: 0.8 },
  { path: "/cuaca", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tanya-umpan", changeFrequency: "monthly", priority: 0.7 },
  { path: "/pakar-umpan", changeFrequency: "monthly", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Sitemap harus memakai URL situs yang sebenarnya, bukan URL localhost.
  if (!siteOrigin) return [];

  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  const addPath = (
    path: string,
    options: Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority" | "lastModified"> = {},
  ) => {
    const url = absoluteUrl(path);
    if (url) entries.set(url, { url, ...options });
  };

  for (const page of publicPages) {
    addPath(page.path, { changeFrequency: page.changeFrequency, priority: page.priority });
  }

  for (const province of provinces) {
    addPath(`/provinsi/${province.slug}`, { changeFrequency: "monthly", priority: 0.6 });
  }

  // Hanya resep basis data yang sudah dipublikasikan yang masuk;
  // draft dan arsip tidak. Jika basis data belum tersedia, sitemap
  // tetap berisi halaman statis dan provinsi.
  let managedRecipes: Array<{ slug: string; status: string; updatedAt: Date }> | undefined;
  try {
    managedRecipes = await db
      .select({ slug: cmsRecipes.slug, status: cmsRecipes.status, updatedAt: cmsRecipes.updatedAt })
      .from(cmsRecipes);
  } catch {
    managedRecipes = undefined;
  }

  for (const recipe of managedRecipes ?? []) {
    if (recipe.status !== "published") continue;
    addPath(`/resep/${recipe.slug}`, {
      changeFrequency: "monthly",
      priority: 0.6,
      lastModified: recipe.updatedAt,
    });
  }

  return [...entries.values()];
}
