import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { RecipeShareForm } from "@/components/recipe-share-form";
import { getCurrentUser } from "@/lib/auth-user";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sunting Resep",
  description: "Perbarui racikan umpan ikan mas yang pernah kamu bagikan.",
  path: "/bagikan",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function SuntingResepPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/profil");
  const { id } = await params;
  const recipeId = Number(id);
  return (
    <PageShell>
      <main className="mx-auto min-h-[70vh] max-w-4xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#8a6d2f]">Resep saya</p>
        <h1 className="mb-8 mt-2 text-3xl font-black tracking-tight text-[#223528] sm:text-4xl">Sunting resep</h1>
        {Number.isInteger(recipeId) && recipeId > 0 ? <RecipeShareForm recipeId={recipeId} /> : <p className="rounded-xl bg-[#fbf0ec] px-4 py-3 text-sm text-[#8a4433]">Alamat resep tidak valid.</p>}
      </main>
      <Footer />
    </PageShell>
  );
}
