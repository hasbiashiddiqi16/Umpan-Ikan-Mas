import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { AccountView } from "@/components/account-view";
import { getCurrentUser } from "@/lib/auth-user";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Akun Saya",
  description: "Kelola resep yang kamu bagikan, ulasanmu, dan resep favorit yang tersinkron antarperangkat.",
  path: "/profil",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/profil");
  const { tab } = await searchParams;
  return (
    <PageShell>
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <AccountView namaAwal={user.name} email={user.email} tabAwal={tab} />
      </main>
      <Footer />
    </PageShell>
  );
}
