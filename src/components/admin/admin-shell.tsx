"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ArrowUpRight, BookOpen, ChartNoAxesCombined, FilePenLine, LayoutDashboard, LogOut, MessageSquareText, Palette, ShieldCheck, Waves } from "lucide-react";
import type { ReactNode } from "react";
import { LOGO_ALT, LOGO_SRC } from "@/lib/brand";

const navigation = [
  { label: "Ringkasan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Konten resep", href: "/dashboard/konten", icon: FilePenLine },
  { label: "Ulasan", href: "/dashboard/ulasan", icon: MessageSquareText },
  { label: "Tampilan", href: "/dashboard/tampilan", icon: Palette },
  { label: "Analitik", href: "/dashboard/analitik", icon: ChartNoAxesCombined },
  { label: "Keamanan", href: "/dashboard/keamanan", icon: ShieldCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-[#243328]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-[#e3e8e1] bg-white px-4 pb-5 pt-5 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-2" aria-label="UMPAN MAS CMS"><Image src={LOGO_SRC} alt={LOGO_ALT} width={44} height={44} className="h-11 w-11 shrink-0" /><span><strong className="block text-sm font-black tracking-[.08em] text-[#24392a]">UMPAN MAS</strong><small className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#929a91]">CONTENT STUDIO</small></span></Link>
        <div className="mt-10 px-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a0a69e]">Ruang kerja</p></div>
        <nav aria-label="Navigasi dashboard" className="mt-3 grid gap-1">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-[#eaf1e7] text-[#2e5938]" : "text-[#636d63] (4.62:1 terburuk) hover:bg-[#f5f7f3] hover:text-[#344638]"}`}><Icon size={17} strokeWidth={active ? 2.3 : 1.9} />{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#56805a]" />}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#f4f7f2] p-4"><div className="flex items-center gap-2 text-[#547051] (4.72:1 terburuk)"><Activity size={15} /><span className="text-[10px] font-extrabold uppercase tracking-[.12em]">MVP Studio</span></div><p className="mt-2 text-xs leading-5 text-[#626c62] (4.69:1 terburuk)">Konten tersimpan di PostgreSQL. Analitik mengukur kunjungan publik sejak tracking aktif.</p></div>
        <Link href="/" className="mt-4 flex min-h-10 items-center justify-between rounded-xl px-3 text-xs font-bold text-[#616d60] (4.66:1 terburuk) transition hover:bg-[#f5f7f3]"><span className="inline-flex items-center gap-2"><Waves size={15} /> Lihat situs publik</span><ArrowUpRight size={14} /></Link>
      </aside>

      <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between border-b border-[#e4e9e2] bg-white/95 px-4 backdrop-blur-lg lg:hidden"><Link href="/dashboard" className="flex items-center gap-2"><Image src={LOGO_SRC} alt={LOGO_ALT} width={36} height={36} className="h-9 w-9 shrink-0" /><span className="text-xs font-black tracking-[.08em] text-[#283c2d]">UMPAN MAS <span className="ml-1 font-bold text-[#92998f]">/ CMS</span></span></Link><div className="flex items-center gap-1"><button type="button" onClick={handleLogout} aria-label="Keluar dari dashboard" title="Keluar" className="grid h-11 w-11 place-items-center rounded-full text-[#626d62] (4.64:1 terburuk) transition hover:bg-[#eef3eb] hover:text-[#294a32]"><LogOut size={18} /></button><Link href="/" aria-label="Lihat situs publik" className="grid h-11 w-11 place-items-center rounded-full bg-[#eef3eb] text-[#476349]"><ArrowUpRight size={17} /></Link></div></header>

      <div className="min-h-screen lg:pl-[252px]">
        <header className="sticky top-0 z-20 hidden h-[68px] items-center justify-between border-b border-[#e4e9e2] bg-[#f9faf8]/90 px-8 backdrop-blur-lg lg:flex"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa097]">UMPAN MAS / Admin</p><p className="mt-0.5 text-sm font-bold text-[#526153]">Content & growth studio</p></div><div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-[#e3e9e1] bg-white px-3 py-2 text-xs font-semibold text-[#616d62] (4.65:1 terburuk)"><span className="h-2 w-2 rounded-full bg-[#74a36c]" />Workspace aktif</span><button type="button" onClick={handleLogout} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#e3e9e1] bg-white px-3 text-xs font-semibold text-[#616d60] (4.66:1 terburuk) transition hover:border-[#cedbca] hover:text-[#294a32]"><LogOut size={14} /> Keluar</button><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e6eee2] text-xs font-extrabold text-[#456247]">UM</span></div></header>
        <main className="mx-auto min-h-[calc(100vh-68px)] max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <nav aria-label="Navigasi dashboard mobile" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e2e8e0] bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-lg lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-6">{navigation.map(({ label, href, icon: Icon }) => { const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-semibold ${active ? "text-[#315a39]" : "text-[#676d66] (4.55:1 terburuk)"}`}><Icon size={18} /><span>{label === "Konten resep" ? "Konten" : label}</span></Link>; })}</div></nav>
    </div>
  );
}
