import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { RecipeShareForm } from "@/components/recipe-share-form";
import { getCurrentUser } from "@/lib/auth-user";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Bagikan Resep",
  description: "Bagikan racikan umpan ikan mas andalanmu dan langsung tayang di katalog UMPAN MAS.",
  path: "/bagikan",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function BagikanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/bagikan");
  return (
    <PageShell>
      <main className="mx-auto min-h-[70vh] max-w-4xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#8a6d2f]">Komunitas pemancing</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#223528] sm:text-4xl">Bagikan racikanmu, {user.name}</h1>
        <p className="mb-8 mt-3 max-w-2xl text-sm leading-6 text-[#636d63]">Isi bahan dan langkah sejujur pengalamanmu. Begitu terkirim, resepmu <strong>langsung tayang</strong> di katalog dan bisa disunting kapan saja dari Akun Saya.</p>
        <RecipeShareForm />
      </main>
      <Footer />
    </PageShell>
  );
}
