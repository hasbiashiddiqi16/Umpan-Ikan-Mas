import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { MasukForm } from "@/components/auth-forms";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Masuk",
  description: "Masuk ke akun UMPAN MAS untuk membagikan resep, melihat ulasanmu, dan menyinkronkan favorit.",
  path: "/masuk",
  noIndex: true,
});

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ next?: string; pesan?: string }> }) {
  const { next, pesan } = await searchParams;
  return (
    <PageShell>
      <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center px-5 py-12 sm:px-8">
        <MasukForm next={next} pesan={pesan} />
      </main>
      <Footer />
    </PageShell>
  );
}
