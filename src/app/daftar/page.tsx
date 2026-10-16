import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { DaftarForm } from "@/components/auth-forms";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Daftar Akun",
  description: "Daftar akun UMPAN MAS gratis untuk membagikan resep umpan ikan mas dan menyinkronkan favorit.",
  path: "/daftar",
  noIndex: true,
});

export default async function DaftarPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <PageShell>
      <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center px-5 py-12 sm:px-8">
        <DaftarForm next={next} />
      </main>
      <Footer />
    </PageShell>
  );
}
