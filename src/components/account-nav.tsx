"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Heart, LogIn, LogOut, MessageSquareText, Plus, UserRound, UserRoundPlus } from "lucide-react";
import { supabasePublicConfig } from "@/utils/supabase/env";
import { syncFavoritesOnce } from "@/lib/favorites-client";

type Sesi = { nama: string; email: string } | null;

function ItemMenu({ href, ikon, children, onClick }: { href: string; ikon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-[#3c4c3e] transition hover:bg-[#f2f5f0]">
      <span className="text-[#5b705c]">{ikon}</span>{children}
    </Link>
  );
}

/**
 * Satu-satunya pintu akun di header publik: ikon profil yang membuka menu
 * berisi Masuk/Daftar (pengunjung) atau halaman akun, tambah resep,
 * favorit, dan Keluar (pengguna yang masuk). Sesi dibaca dari Supabase di
 * peramban; bila Supabase belum dikonfigurasi, menu tampil seperti untuk
 * pengunjung (situs tetap bisa dipakai tanpa akun).
 */
export function AccountNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [sesi, setSesi] = useState<Sesi>(null);
  const [siap, setSiap] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const wadahRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabasePublicConfig()) { const t = window.setTimeout(() => setSiap(true), 0); return () => window.clearTimeout(t); }
    let aktif = true;
    let berhenti: (() => void) | undefined;
    const terapkan = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!aktif) return;
      if (!user) { setSesi(null); setSiap(true); return; }
      const meta = user.user_metadata ?? {};
      const namaMeta = [meta.display_name, meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim().length > 0);
      setSesi({ nama: (namaMeta ?? user.email?.split("@")[0] ?? "Akun").slice(0, 60), email: user.email ?? "" });
      setSiap(true);
      void syncFavoritesOnce();
    };
    // Klien Supabase dimuat terpisah (dynamic import) supaya tidak membebani
    // bundel awal setiap halaman hanya untuk memeriksa sesi di header.
    void import("@/utils/supabase/client").then(({ createClient }) => {
      if (!aktif) return;
      const supabase = createClient();
      void supabase.auth.getSession().then(({ data }) => terapkan(data.session?.user ?? null)).catch(() => { if (aktif) setSiap(true); });
      const { data: langganan } = supabase.auth.onAuthStateChange((_event, session) => terapkan(session?.user ?? null));
      berhenti = () => langganan.subscription.unsubscribe();
    }).catch(() => { if (aktif) setSiap(true); });
    return () => { aktif = false; berhenti?.(); };
  }, []);

  // Menu menutup saat berpindah halaman, diklik di luar, atau tombol Escape.
  const [ruteSebelumnya, setRuteSebelumnya] = useState(pathname);
  if (pathname !== ruteSebelumnya) {
    setRuteSebelumnya(pathname);
    setTerbuka(false);
  }
  useEffect(() => {
    if (!terbuka) return;
    const klik = (event: MouseEvent) => { if (wadahRef.current && !wadahRef.current.contains(event.target as Node)) setTerbuka(false); };
    const tombol = (event: KeyboardEvent) => { if (event.key === "Escape") setTerbuka(false); };
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", tombol);
    return () => { document.removeEventListener("mousedown", klik); document.removeEventListener("keydown", tombol); };
  }, [terbuka]);

  async function keluar() {
    setTerbuka(false);
    try {
      if (supabasePublicConfig()) { const { createClient } = await import("@/utils/supabase/client"); await createClient().auth.signOut(); }
    } catch { /* tetap kembali ke beranda */ }
    try { sessionStorage.removeItem("umpan-mas-favorites-synced"); } catch { /* abaikan */ }
    router.replace("/");
    router.refresh();
  }

  const tutup = () => setTerbuka(false);

  if (!siap) {
    return <Link href="/profil" aria-label="Profil" className="grid h-10 w-10 place-items-center rounded-full bg-[#e8eee5] text-[#36533b] transition hover:bg-[#dfe9dc]"><UserRound size={18} /></Link>;
  }

  return (
    <div ref={wadahRef} className="relative">
      <button type="button" onClick={() => setTerbuka((v) => !v)} aria-haspopup="menu" aria-expanded={terbuka} aria-label={sesi ? `Menu akun ${sesi.nama}` : "Menu profil"}
        className={sesi ? "grid h-10 w-10 place-items-center rounded-full bg-[#294b34] text-sm font-black text-white transition hover:bg-[#223f2b]" : "grid h-10 w-10 place-items-center rounded-full bg-[#e8eee5] text-[#36533b] transition hover:bg-[#dfe9dc]"}>
        {sesi ? (sesi.nama.trim()[0]?.toUpperCase() ?? "P") : <UserRound size={18} />}
      </button>
      {terbuka && (
        <div role="menu" aria-label="Menu profil" className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-[#e4e9e2] bg-white p-2 shadow-[0_24px_60px_rgba(28,45,32,.16)]">
          {sesi ? (
            <>
              <div className="px-3 pb-2 pt-2.5">
                <p className="truncate text-sm font-extrabold text-[#2c3f30]">{sesi.nama}</p>
                {sesi.email ? <p className="truncate text-xs text-[#7c857c]">{sesi.email}</p> : null}
              </div>
              <div className="my-1.5 h-px bg-[#eef0ec]" />
              <ItemMenu href="/profil" ikon={<UserRound size={17} />} onClick={tutup}>Akun Saya</ItemMenu>
              <ItemMenu href="/bagikan" ikon={<Plus size={17} />} onClick={tutup}>Bagikan Resep</ItemMenu>
              <ItemMenu href="/profil?tab=resep" ikon={<BookOpen size={17} />} onClick={tutup}>Resep Saya</ItemMenu>
              <ItemMenu href="/profil?tab=ulasan" ikon={<MessageSquareText size={17} />} onClick={tutup}>Ulasan Saya</ItemMenu>
              <ItemMenu href="/profil?tab=favorit" ikon={<Heart size={17} />} onClick={tutup}>Favorit</ItemMenu>
              <div className="my-1.5 h-px bg-[#eef0ec]" />
              <button type="button" role="menuitem" onClick={() => void keluar()} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-[#8a4433] transition hover:bg-[#fbf2ee]">
                <LogOut size={17} /> Keluar
              </button>
            </>
          ) : (
            <>
              <ItemMenu href="/masuk" ikon={<LogIn size={17} />} onClick={tutup}>Masuk</ItemMenu>
              <ItemMenu href="/daftar" ikon={<UserRoundPlus size={17} />} onClick={tutup}>Daftar</ItemMenu>
              <div className="my-1.5 h-px bg-[#eef0ec]" />
              <ItemMenu href="/masuk?next=/bagikan" ikon={<Plus size={17} />} onClick={tutup}>Bagikan Resep</ItemMenu>
              <ItemMenu href="/katalog?favorites=1" ikon={<Heart size={17} />} onClick={tutup}>Favorit Saya</ItemMenu>
            </>
          )}
        </div>
      )}
    </div>
  );
}
