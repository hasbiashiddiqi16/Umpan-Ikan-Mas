import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { AturUlangSandiForm } from "@/components/auth-forms";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Buat Kata Sandi Baru",
  description: "Buat kata sandi baru untuk akun UMPAN MAS dari tautan atur ulang yang dikirim ke email.",
  path: "/lupa-sandi/reset",
  noIndex: true,
});

export default function AturUlangSandiPage() {
  return (
    <PageShell>
      <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center px-5 py-12 sm:px-8">
        <AturUlangSandiForm />
      </main>
      <Footer />
    </PageShell>
  );
}
