"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChartNoAxesCombined, FilePenLine, LayoutDashboard, LogOut, Menu, MessageSquareText, Palette, PanelLeftClose, PanelLeftOpen, ShieldCheck, Users, Waves, X } from "lucide-react";
import type { ReactNode } from "react";
import { LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { AppearanceLogoImage } from "@/components/appearance-logo";
import { useAdminMe, type AdminMe } from "@/components/admin/use-admin-me";
import type { AdminRole } from "@/lib/admin-roles";

// Menu disaring per peran (Task 114). Ini hanya tampilan: penegakan yang
// menentukan tetap di server lewat requireAdminApi() per kapabilitas.
const navigation: { label: string; href: string; icon: typeof LayoutDashboard; roles: AdminRole[] }[] = [
  { label: "Ringkasan", href: "/dashboard", icon: LayoutDashboard, roles: ["pemilik", "editor", "moderator", "hanya_lihat"] },
  { label: "Konten resep", href: "/dashboard/konten", icon: FilePenLine, roles: ["pemilik", "editor", "hanya_lihat"] },
  { label: "Moderasi Ulasan", href: "/dashboard/ulasan", icon: MessageSquareText, roles: ["pemilik", "editor", "moderator", "hanya_lihat"] },
  { label: "Pengguna", href: "/dashboard/pengguna", icon: Users, roles: ["pemilik"] },
  { label: "Tampilan", href: "/dashboard/tampilan", icon: Palette, roles: ["pemilik", "editor", "hanya_lihat"] },
  { label: "Analitik", href: "/dashboard/analitik", icon: ChartNoAxesCombined, roles: ["pemilik", "editor"] },
  { label: "Keamanan", href: "/dashboard/keamanan", icon: ShieldCheck, roles: ["pemilik"] },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Di layar kecil sidebar berupa drawer dari kiri; di desktop sidebar bisa dilipat.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Identitas + peran sesi saat ini untuk menyaring menu dan label akun.
  const me: AdminMe | null = useAdminMe();

  // Saat drawer terbuka: kunci scroll halaman di belakangnya dan izinkan Escape menutup.
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => !current);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-[#243328]">
      <aside aria-label="Sidebar dashboard" className={`fixed inset-y-0 left-0 z-50 flex w-[252px] max-w-[86vw] flex-col border-r border-[#e3e8e1] bg-white px-4 pb-5 pt-5 transition-[transform,visibility] duration-300 ease-out ${mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"} ${collapsed ? "lg:invisible lg:-translate-x-full" : "lg:visible lg:translate-x-0"}`}>
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 px-2" aria-label="UMPAN MAS CMS"><AppearanceLogoImage slot="logo" src={LOGO_SRC} alt={LOGO_ALT} width={44} height={44} className="h-11 w-11 shrink-0" /><span><strong className="block text-sm font-black tracking-[.08em] text-[#24392a]">UMPAN MAS</strong><small className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#929a91]">CONTENT STUDIO</small></span></Link>
          <button type="button" onClick={toggleCollapsed} aria-label="Sembunyikan sidebar" title="Sembunyikan sidebar" className="hidden h-10 w-10 shrink-0 place-items-center rounded-full text-[#626d62] transition hover:bg-[#eef3eb] hover:text-[#294a32] lg:grid"><PanelLeftClose size={17} /></button>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Tutup sidebar" title="Tutup sidebar" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#626d62] transition hover:bg-[#eef3eb] hover:text-[#294a32] lg:hidden"><X size={18} /></button>
        </div>
        <div className="mt-10 px-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a0a69e]">Ruang kerja</p></div>
        <nav aria-label="Navigasi dashboard" className="mt-3 grid gap-1">
          {navigation.filter((item) => !me || item.roles.includes(me.role)).map(({ label, href, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-[#eaf1e7] text-[#2e5938]" : "text-[#636d63] (4.62:1 terburuk) hover:bg-[#f5f7f3] hover:text-[#344638]"}`}><Icon size={17} strokeWidth={active ? 2.3 : 1.9} />{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#56805a]" />}</Link>;
          })}
        </nav>
        {me && (
          <div className="mb-3 mt-6 rounded-2xl border border-[#e5eae3] px-4 py-3">
            <p className="truncate text-xs font-extrabold text-[#344638]">{me.username}{me.primary ? " (admin utama)" : ""}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#929a91]">Peran: {me.roleLabel}</p>
          </div>
        )}
        <Link href="/" className="mt-auto flex min-h-10 items-center justify-between rounded-xl px-3 pt-2 text-xs font-bold text-[#616d60] (4.66:1 terburuk) transition hover:bg-[#f5f7f3]"><span className="inline-flex items-center gap-2"><Waves size={15} /> Lihat situs publik</span><ArrowUpRight size={14} /></Link>
      </aside>
      {mobileOpen && <button type="button" aria-label="Tutup sidebar" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 cursor-default bg-[#152419]/45 backdrop-blur-[2px] lg:hidden" />}

      <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between gap-2 border-b border-[#e4e9e2] bg-white/95 px-4 backdrop-blur-lg lg:hidden"><div className="flex min-w-0 items-center gap-1"><button type="button" onClick={() => setMobileOpen(true)} aria-label="Buka sidebar navigasi" aria-expanded={mobileOpen} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#3f5544] transition hover:bg-[#eef3eb]"><Menu size={19} /></button><Link href="/dashboard" className="flex min-w-0 items-center gap-2"><AppearanceLogoImage slot="logo" src={LOGO_SRC} alt={LOGO_ALT} width={36} height={36} className="h-9 w-9 shrink-0" /><span className="truncate text-xs font-black tracking-[.08em] text-[#283c2d]">UMPAN MAS <span className="ml-1 font-bold text-[#92998f]">/ CMS</span></span></Link></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={handleLogout} aria-label="Keluar dari dashboard" title="Keluar" className="grid h-11 w-11 place-items-center rounded-full text-[#626d62] (4.64:1 terburuk) transition hover:bg-[#eef3eb] hover:text-[#294a32]"><LogOut size={18} /></button><Link href="/" aria-label="Lihat situs publik" className="grid h-11 w-11 place-items-center rounded-full bg-[#eef3eb] text-[#476349]"><ArrowUpRight size={17} /></Link></div></header>

      <div className={`min-h-screen transition-[padding] duration-300 ${collapsed ? "lg:pl-0" : "lg:pl-[252px]"}`}>
        <header className="sticky top-0 z-20 hidden h-[68px] items-center justify-between border-b border-[#e4e9e2] bg-[#f9faf8]/90 px-8 backdrop-blur-lg lg:flex"><div className="flex items-center gap-3"><button type="button" onClick={toggleCollapsed} aria-expanded={!collapsed} aria-label={collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"} title={collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"} className="grid h-10 w-10 place-items-center rounded-full border border-[#e3e9e1] bg-white text-[#526153] transition hover:border-[#cedbca] hover:text-[#294a32]">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa097]">UMPAN MAS / Admin</p><p className="mt-0.5 text-sm font-bold text-[#526153]">Content & growth studio</p></div></div><div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-[#e3e9e1] bg-white px-3 py-2 text-xs font-semibold text-[#616d62] (4.65:1 terburuk)"><span className="h-2 w-2 rounded-full bg-[#74a36c]" />Workspace aktif</span><button type="button" onClick={handleLogout} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#e3e9e1] bg-white px-3 text-xs font-semibold text-[#616d60] (4.66:1 terburuk) transition hover:border-[#cedbca] hover:text-[#294a32]"><LogOut size={14} /> Keluar</button><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e6eee2] text-xs font-extrabold text-[#456247]" title={me ? `${me.username} · ${me.roleLabel}` : undefined}>{me ? me.username.slice(0, 2).toUpperCase() : "UM"}</span></div></header>
        <main className="mx-auto min-h-[calc(100vh-68px)] max-w-[1440px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
