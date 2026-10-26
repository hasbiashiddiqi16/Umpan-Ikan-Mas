import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { LupaSandiForm } from "@/components/auth-forms";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Lupa Kata Sandi",
  description: "Minta tautan atur ulang kata sandi akun UMPAN MAS yang terdaftar dengan email.",
  path: "/lupa-sandi",
  noIndex: true,
});

export default function LupaSandiPage() {
  return (
    <PageShell>
      <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center px-5 py-12 sm:px-8">
        <LupaSandiForm />
      </main>
      <Footer />
    </PageShell>
  );
}
