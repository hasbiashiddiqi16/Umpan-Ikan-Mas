"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { supabasePublicConfig } from "@/utils/supabase/env";
import { syncFavoritesOnce } from "@/lib/favorites-client";

type Sesi = { nama: string } | null;

/**
 * Area akun di navbar. Membaca sesi Supabase di peramban: pengunjung
 * anonim melihat tombol Masuk/Daftar, pengguna yang masuk melihat nama
 * + tombol Bagikan Resep. Bila Supabase belum dikonfigurasi, tampil
 * seperti pengunjung anonim (situs tetap bisa dipakai tanpa akun).
 */
export function AccountNav() {
  const [sesi, setSesi] = useState<Sesi>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    if (!supabasePublicConfig()) { const timer = window.setTimeout(() => setSiap(true), 0); return () => window.clearTimeout(timer); }
    const supabase = createClient();
    let aktif = true;
    const terapkan = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!aktif) return;
      if (!user) { setSesi(null); setSiap(true); return; }
      const meta = user.user_metadata ?? {};
      const namaMeta = [meta.display_name, meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim().length > 0);
      setSesi({ nama: (namaMeta ?? user.email?.split("@")[0] ?? "Akun").slice(0, 40) });
      setSiap(true);
      void syncFavoritesOnce();
    };
    void supabase.auth.getSession().then(({ data }) => terapkan(data.session?.user ?? null)).catch(() => { if (aktif) setSiap(true); });
    const { data: langganan } = supabase.auth.onAuthStateChange((_event, session) => terapkan(session?.user ?? null));
    return () => { aktif = false; langganan.subscription.unsubscribe(); };
  }, []);

  if (!siap) return <span className="hidden h-10 w-24 sm:block" aria-hidden="true" />;
  if (!sesi) {
    return (
      <span className="flex items-center gap-1.5">
        <Link href="/masuk" className="hidden min-h-10 items-center rounded-full px-3 text-[13px] font-bold text-[#36533b] transition hover:bg-[#edf1eb] min-[420px]:inline-flex">Masuk</Link>
        <Link href="/daftar" className="inline-flex min-h-10 items-center rounded-full bg-[#294b34] px-3.5 text-[13px] font-bold text-white transition hover:bg-[#223f2b]">Daftar</Link>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <Link href="/bagikan" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#294b34] px-3.5 text-[13px] font-bold text-white transition hover:bg-[#223f2b]"><Plus size={15} /> <span className="hidden min-[420px]:inline">Bagikan Resep</span><span className="min-[420px]:hidden">Bagikan</span></Link>
      <Link href="/profil" className="hidden max-w-32 truncate rounded-full px-2 text-[13px] font-bold text-[#36533b] transition hover:bg-[#edf1eb] md:inline-block" title={sesi.nama}>{sesi.nama}</Link>
    </span>
  );
}
