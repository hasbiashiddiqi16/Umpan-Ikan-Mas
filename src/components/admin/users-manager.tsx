"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Heart, LoaderCircle, MailCheck, MessageSquareText, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";

type RegisteredUser = {
  id: string;
  email: string;
  name: string;
  providers: string;
  emailConfirmed: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  recipeCount: number;
  reviewCount: number;
  favoriteCount: number;
};

function dateLabel(value: string | null) {
  if (!value) return "Belum pernah masuk";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function inisial(nama: string) {
  return nama.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "P";
}

export function RegisteredUsersManager() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [tersedia, setTersedia] = useState(true);
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/users", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { tersedia?: boolean; users?: RegisteredUser[]; pesan?: string; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Daftar pengguna belum dapat dimuat.");
        setUsers(body.users ?? []);
        setTersedia(body.tersedia !== false);
        setPesan(body.pesan ?? "");
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") setError(err instanceof Error ? err.message : "Daftar pengguna belum dapat dimuat.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const ringkasan = useMemo(() => ({
    total: users.length,
    google: users.filter((user) => user.providers.includes("google")).length,
    email: users.filter((user) => !user.providers.includes("google")).length,
    resepPengguna: users.reduce((acc, user) => acc + user.recipeCount, 0),
  }), [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q));
  }, [users, query]);

  const kartu = [
    { label: "Total pengguna", value: ringkasan.total, icon: Users, kelas: "bg-[#edf4e9] text-[#4f734d]" },
    { label: "Masuk via Google", value: ringkasan.google, icon: MailCheck, kelas: "bg-[#faf3e3] text-[#7e6633]" },
    { label: "Masuk via email", value: ringkasan.email, icon: UserRound, kelas: "bg-[#eef3ec] text-[#4e664e]" },
    { label: "Resep dibagikan pengguna", value: ringkasan.resepPengguna, icon: BookOpen, kelas: "bg-[#f0f6ed] text-[#426744]" },
  ];

  return (
    <AdminShell>
      <div className="mb-7">
        <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#656d64]"><Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Pengguna</span></div>
        <h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Pengguna terdaftar</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#626c62]">Akun yang mendaftar lewat halaman Masuk/Daftar (Supabase Auth), beserta resep, ulasan, dan favorit mereka. Daftar ini hanya-baca. Penghapusan atau pemblokiran akun dilakukan dari dashboard Supabase (Authentication → Users).</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kartu.map(({ label, value, icon: Icon, kelas }) => (
          <div key={label} className="rounded-2xl border border-[#e4eae1] bg-white p-4">
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${kelas}`}><Icon size={16} /></span>
            <p className="mt-3 text-2xl font-black text-[#364539]">{loading ? "…" : new Intl.NumberFormat("id-ID").format(value)}</p>
            <p className="mt-1 text-[10px] font-semibold text-[#92998f]">{label}</p>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}
      {!tersedia && !loading && (
        <p role="status" className="mb-4 rounded-xl border border-[#e9dfc4] bg-[#fdf8e9] px-4 py-3 text-xs leading-5 font-medium text-[#7a6420]">{pesan || "Daftar pengguna belum tersedia dari basis data ini."}</p>
      )}

      <section className="overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-[#eef0ec] p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Semua akun</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Diurutkan dari pendaftaran terbaru. Aktivitas dihitung dari data situs, bukan perkiraan.</p>
          </div>
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#e4e9e2] px-3 sm:w-72">
            <Search size={15} className="text-[#929a91]" />
            <span className="sr-only">Cari pengguna</span>
            <input className="w-full bg-transparent text-xs outline-none placeholder:text-[#a0a79f]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau email…" />
          </label>
        </div>

        {loading ? (
          <p className="inline-flex items-center gap-2 p-6 text-sm text-[#636d63]"><LoaderCircle size={16} className="animate-spin" /> Memuat pengguna terdaftar…</p>
        ) : filtered.length ? (
          <div className="divide-y divide-[#eff1ed]">
            {filtered.map((user) => (
              <article key={user.id} className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#edf2e9] text-xs font-extrabold text-[#4e664e]">{inisial(user.name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm font-extrabold text-[#344638]">{user.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${user.providers.includes("google") ? "bg-[#e8f0fe] text-[#3c5a96]" : "bg-[#f1f4ee] text-[#5c6a5c]"}`}>{user.providers.includes("google") ? "Google" : "Email"}</span>
                    {!user.emailConfirmed && <span className="rounded-full bg-[#fdf3e3] px-2 py-0.5 text-[9px] font-bold text-[#8a6d2f]">Email belum dikonfirmasi</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#7c857c]">{user.email || "—"}</p>
                  <p className="mt-1 text-[10px] text-[#969d94]">Daftar {dateLabel(user.createdAt)} · Terakhir masuk {dateLabel(user.lastSignInAt)}</p>
                </div>
                <div className="flex shrink-0 gap-4 text-center md:gap-5">
                  <span><strong className="block text-sm font-black text-[#364539]">{user.recipeCount}</strong><span className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-[#92998f]"><BookOpen size={10} /> Resep</span></span>
                  <span><strong className="block text-sm font-black text-[#364539]">{user.reviewCount}</strong><span className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-[#92998f]"><MessageSquareText size={10} /> Ulasan</span></span>
                  <span><strong className="block text-sm font-black text-[#364539]">{user.favoriteCount}</strong><span className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-[#92998f]"><Heart size={10} /> Favorit</span></span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f4ee] text-[#606e5e]"><Users size={20} /></span>
              <h3 className="mt-4 text-sm font-extrabold text-[#3b4b3d]">{users.length ? "Tidak ada pengguna yang cocok" : "Belum ada pengguna terdaftar"}</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-[#656d65]">{users.length ? "Coba kata kunci pencarian yang lain." : "Begitu ada pengunjung mendaftar lewat halaman Daftar, akunnya muncul di sini lengkap dengan aktivitasnya."}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-[#eef0ec] bg-[#fafbf9] px-4 py-3 text-[9px] text-[#959c93] sm:px-5"><ShieldCheck size={12} /> Hanya admin yang masuk dashboard yang dapat melihat daftar ini. Halaman ini tidak terhubung ke situs publik.</div>
      </section>
    </AdminShell>
  );
}
