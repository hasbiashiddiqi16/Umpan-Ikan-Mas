"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, Bot, Home, Map, Search, UserRound, CloudSun } from "lucide-react";
import { LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { AccountNav } from "@/components/account-nav";

const desktopLinks = [
  { label: "Beranda", href: "/" },
  { label: "Katalog", href: "/katalog" },
  { label: "Cuaca", href: "/cuaca" },
  { label: "Provinsi", href: "/provinsi" },
  { label: "AI Umpan", href: "/ai-umpan" },
  { label: "Sistem Pakar", href: "/sistem-pakar" },
  { label: "Komunitas", href: "/komunitas" },
];

const mobileLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Katalog", href: "/katalog", icon: BookOpen },
  { label: "Pakar", href: "/sistem-pakar", icon: Bot },
  { label: "Provinsi", href: "/provinsi", icon: Map },
  { label: "Profil", href: "/profil", icon: UserRound },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-[#e8ebe5]/80 bg-[#fbfcf9]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link href="/" aria-label="UMPAN MAS, beranda" className="flex shrink-0 items-center gap-2.5">
          <Image src={LOGO_SRC} alt={LOGO_ALT} width={40} height={40} className="h-10 w-10 shrink-0" />
          <span className="text-[15px] font-black tracking-[.07em] text-[#21392a] sm:text-base">UMPAN MAS</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {desktopLinks.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return <Link key={link.href} href={link.href} className={`rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${active ? "bg-[#e9efe7] text-[#284a31]" : "text-[#646e64] (4.55:1 terburuk) hover:bg-[#f0f3ee] hover:text-[#203a29]"}`}>{link.label}</Link>;
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/katalog" aria-label="Cari resep" className="grid h-10 w-10 place-items-center rounded-full text-[#4b5b4e] transition hover:bg-[#edf1eb]"><Search size={19} /></Link>
          <AccountNav />
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi bawah" className="mobile-nav fixed inset-x-0 bottom-0 z-50 border-t border-[#e5e9e2] bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_30px_rgba(31,46,34,.08)] backdrop-blur-lg lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {mobileLinks.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition ${active ? "text-[#315a39]" : "text-[#656b65] (4.69:1 terburuk) hover:text-[#435b47]"}`} aria-current={active ? "page" : undefined}>
              <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-[#203326] focus:shadow-lg">Lewati ke konten utama</a>
    <Navbar />
    <div id="main-content" tabIndex={-1}>{children}</div>
    <MobileBottomNav />
  </>;
}

export function MobilePageTitle({ title }: { title: string }) {
  return <div className="mb-5 flex items-center gap-2 text-sm font-medium text-[#636d64] (4.62:1 terburuk)"><CloudSun size={16} /> {title}</div>;
}
