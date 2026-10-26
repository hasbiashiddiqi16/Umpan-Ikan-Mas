import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, ShieldCheck, Waves } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createPageMetadata } from "@/lib/seo";
import { LOGO_ALT, LOGO_SRC } from "@/lib/brand";

export const metadata: Metadata = createPageMetadata({
  title: "Masuk Administrator",
  description: "Halaman administrator untuk mengelola konten UMPAN MAS.",
  path: "/login",
  noIndex: true,
});

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#f2f5ef] px-4 py-5 text-[#243328] sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-40px)] max-w-[1180px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_90px_-45px_rgba(24,47,32,.38)] lg:grid-cols-[1.04fr_.96fr]">
        <section className="relative hidden overflow-hidden bg-[#193a2a] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[#d5b76b]/10 blur-3xl" />

          <Link href="/" className="relative flex w-fit items-center gap-3" aria-label="Kembali ke situs UMPAN MAS">
            <Image src={LOGO_SRC} alt={LOGO_ALT} width={48} height={48} className="h-12 w-12 shrink-0" />
            <span>
              <strong className="block text-sm font-black tracking-[.12em]">UMPAN MAS</strong>
              <small className="mt-1 block text-[10px] font-bold uppercase tracking-[.2em] text-[#c6d7c7]">CONTENT STUDIO</small>
            </span>
          </Link>

          <div className="relative max-w-lg py-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#d2dfd0]"><Waves size={13} /> Ruang kerja admin</span>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.12] tracking-[-.04em] xl:text-[46px]">Racikan terbaik dimulai dari pengelolaan yang rapi.</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#c2d0c3]">Kelola resep, moderasi cerita, dan pantau performa UMPAN MAS di satu tempat.</p>
          </div>

          <div className="relative flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-[#cad8ca]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-[#d9c27f]"><ShieldCheck size={17} /></span>
            <span><strong className="block font-semibold text-white">Akses administrator</strong><span className="mt-0.5 block text-[11px] text-[#aebfae]">Sesi dilindungi dan berakhir otomatis.</span></span>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-40px)] flex-col justify-center px-6 py-9 sm:px-12 lg:px-14 xl:px-[72px]">
          <Link href="/" className="mb-12 flex w-fit items-center gap-2 lg:hidden">
            <Image src={LOGO_SRC} alt={LOGO_ALT} width={40} height={40} className="h-10 w-10 shrink-0" />
            <span className="text-sm font-black tracking-[.1em] text-[#24392a]">UMPAN MAS</span>
          </Link>

          <div className="mx-auto w-full max-w-[390px]">
            <div className="mb-7 grid h-12 w-12 place-items-center rounded-2xl bg-[#edf3e9] text-[#416347]"><LockKeyhole size={21} /></div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#606f5e] (4.58:1 terburuk)">Administrator</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-.035em] text-[#243328] sm:text-[34px]">Selamat datang kembali</h2>
            <p className="mt-3 text-sm leading-6 text-[#636d63] (4.62:1 terburuk)">Masuk untuk mengelola Content Studio UMPAN MAS.</p>

            <div className="mt-8">
              <AdminLoginForm />
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e7ece4] bg-[#f8faf6] p-4">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#567254] (4.58:1 terburuk)" />
              <p className="text-xs leading-5 text-[#636d62] (4.63:1 terburuk)">Khusus administrator. Jangan bagikan password dan jangan biarkan sesi terbuka di perangkat umum.</p>
            </div>

            <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#5d6e5d] (4.67:1 terburuk) transition hover:text-[#294a32]"><ArrowLeft size={16} /> Kembali ke situs publik</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
