"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Heart, LoaderCircle, LogOut, MessageSquareText, Pencil, Plus, Save, Trash2, UserRound } from "lucide-react";
import { recipes } from "@/data/recipes";
import { cmsRecipeToRecipe, mergeRecipesBySlug, type CmsRecipeRecord } from "@/lib/cms";
import { createClient } from "@/utils/supabase/client";
import { supabasePublicConfig } from "@/utils/supabase/env";
import { readLocalFavorites, writeLocalFavorites, FAVORITES_EVENT } from "@/lib/favorites-client";
import { RecipeCard } from "@/components/recipe-card";
import { SectionHeader } from "@/components/shared";

type Tab = "resep" | "ulasan" | "favorit";
type UlasanSaya = { id: number; recipeSlug: string; recipeTitle: string; rating: number; comment: string; status: string; createdAt: string; location: string };

const labelStatusResep: Record<string, string> = { published: "Tayang", draft: "Draf", archived: "Diarsipkan" };
const labelStatusUlasan: Record<string, string> = { approved: "Disetujui", pending: "Menunggu moderasi", rejected: "Tidak ditampilkan" };

function formatTanggal(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function AccountView({ namaAwal, email, tabAwal }: { namaAwal: string; email: string; tabAwal?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(tabAwal === "ulasan" || tabAwal === "favorit" ? tabAwal : "resep");
  const [nama, setNama] = useState(namaAwal);
  const [namaDraf, setNamaDraf] = useState(namaAwal);
  const [sibukNama, setSibukNama] = useState(false);
  const [pesanNama, setPesanNama] = useState("");
  const [resepSaya, setResepSaya] = useState<CmsRecipeRecord[]>([]);
  const [ulasanSaya, setUlasanSaya] = useState<UlasanSaya[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [publishedRecipes, setPublishedRecipes] = useState<ReturnType<typeof cmsRecipeToRecipe>[]>([]);
  const [shadowedSlugs, setShadowedSlugs] = useState<string[]>([]);

  const muatAkun = useCallback(async () => {
    setMemuat(true);
    try {
      const [rResep, rUlasan] = await Promise.all([
        fetch("/api/user/recipes", { headers: { Accept: "application/json" } }),
        fetch("/api/user/reviews", { headers: { Accept: "application/json" } }),
      ]);
      if (rResep.status === 401 || rUlasan.status === 401) { router.replace("/masuk?next=/profil"); return; }
      const dResep = rResep.ok ? (await rResep.json()) as { recipes?: CmsRecipeRecord[] } : { recipes: [] };
      const dUlasan = rUlasan.ok ? (await rUlasan.json()) as { reviews?: UlasanSaya[] } : { reviews: [] };
      setResepSaya(dResep.recipes ?? []);
      setUlasanSaya(dUlasan.reviews ?? []);
    } catch { setGalat("Data akun belum dapat dimuat. Periksa koneksimu lalu muat ulang halaman."); }
    setMemuat(false);
  }, [router]);

  useEffect(() => { const timer = window.setTimeout(() => { void muatAkun(); }, 0); return () => window.clearTimeout(timer); }, [muatAkun]);

  useEffect(() => {
    const sync = () => setFavoriteSlugs(readLocalFavorites());
    sync();
    const update = (event: Event) => { const detail = (event as CustomEvent<string[]>).detail; setFavoriteSlugs(Array.isArray(detail) ? detail : readLocalFavorites()); };
    window.addEventListener(FAVORITES_EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(FAVORITES_EVENT, update); window.removeEventListener("storage", update); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/public/recipes", { cache: "no-store", signal: controller.signal })
      .then(async (r) => r.ok ? r.json() as Promise<{ recipes?: CmsRecipeRecord[]; shadowedSlugs?: string[] }> : { recipes: [], shadowedSlugs: [] })
      .then((body) => { setPublishedRecipes((body.recipes ?? []).map((record) => cmsRecipeToRecipe(record))); setShadowedSlugs(body.shadowedSlugs ?? []); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const savedRecipes = useMemo(() => {
    const managed = new Set(shadowedSlugs);
    const all = mergeRecipesBySlug(recipes.filter((r) => !managed.has(r.slug)), publishedRecipes);
    return all.filter((r) => favoriteSlugs.includes(r.slug));
  }, [favoriteSlugs, publishedRecipes, shadowedSlugs]);

  async function simpanNama() {
    const bersih = namaDraf.trim();
    if (bersih.length < 2) { setPesanNama("Nama tampil minimal 2 karakter."); return; }
    if (!supabasePublicConfig()) { setPesanNama("Supabase belum dikonfigurasi di server."); return; }
    setSibukNama(true); setPesanNama("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { display_name: bersih } });
    setSibukNama(false);
    if (error) { setPesanNama("Nama belum berhasil diubah. Coba lagi."); return; }
    setNama(bersih); setPesanNama("Nama tampil diperbarui.");
    router.refresh();
  }

  async function keluar() {
    try {
      if (supabasePublicConfig()) { const supabase = createClient(); await supabase.auth.signOut(); }
    } catch { /* tetap keluar ke beranda */ }
    try { sessionStorage.removeItem("umpan-mas-favorites-synced"); } catch { /* abaikan */ }
    router.replace("/");
    router.refresh();
  }

  async function hapusResep(id: number, judul: string) {
    if (!window.confirm(`Hapus resep "${judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const r = await fetch(`/api/user/recipes/${id}`, { method: "DELETE" });
    if (r.ok) setResepSaya((cur) => cur.filter((item) => item.id !== id));
    else setGalat("Resep gagal dihapus. Coba lagi.");
  }

  function hapusSemuaFavorit() {
    writeLocalFavorites([]);
    void fetch("/api/user/favorites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: [] }) }).catch(() => undefined);
  }

  const tombolTab = (id: Tab, label: string, jumlah: number, Icon: typeof BookOpen) => (
    <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${tab === id ? "bg-[#294b34] text-white" : "bg-white text-[#4b5b4e] ring-1 ring-[#e2e7df] hover:bg-[#f2f5f0]"}`}>
      <Icon size={16} /> {label} <span className={`rounded-full px-2 py-0.5 text-xs ${tab === id ? "bg-white/20" : "bg-[#eef2ec]"}`}>{jumlah}</span>
    </button>
  );

  return (
    <div>
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#203e2c] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="absolute -right-12 -top-20 -z-10 h-56 w-56 rounded-full border-[34px] border-white/[.05]" />
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><UserRound size={22} /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.15em] text-[#d9c994]">Akun saya</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Halo, {nama}!</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">{email} · Resep yang kamu bagikan langsung tayang, ulasanmu tampil setelah moderasi, dan favorit tersinkron antarperangkat.</p>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="block min-w-56 flex-1 sm:max-w-xs">
            <span className="mb-1.5 block text-xs font-bold text-white/80">Nama tampil</span>
            <input value={namaDraf} onChange={(e) => setNamaDraf(e.target.value)} maxLength={100} className="min-h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-white/50" placeholder="Nama tampilmu" />
          </label>
          <button type="button" onClick={simpanNama} disabled={sibukNama} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#294b34] transition hover:bg-[#eef3ea] disabled:opacity-60">
            {sibukNama ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Simpan nama
          </button>
          <button type="button" onClick={keluar} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-bold text-white transition hover:bg-white/10"><LogOut size={16} /> Keluar</button>
        </div>
        {pesanNama ? <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#cfe6c8]"><Check size={15} /> {pesanNama}</p> : null}
      </section>

      {galat ? <p role="alert" className="mt-5 rounded-xl bg-[#fbf0ec] px-4 py-3 text-sm text-[#8a4433]">{galat}</p> : null}

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Isi akun">
        {tombolTab("resep", "Resep Saya", resepSaya.length, BookOpen)}
        {tombolTab("ulasan", "Ulasan Saya", ulasanSaya.length, MessageSquareText)}
        {tombolTab("favorit", "Favorit", favoriteSlugs.length, Heart)}
      </div>

      {memuat ? (
        <p className="mt-10 inline-flex items-center gap-2 text-sm text-[#636d63]"><LoaderCircle size={17} className="animate-spin" /> Memuat isi akunmu…</p>
      ) : tab === "resep" ? (
        <section className="pt-8">
          <SectionHeader eyebrow="Berbagi racikan" title="Resep Saya" subtitle={resepSaya.length ? `${resepSaya.length} resep pernah kamu bagikan.` : "Bagikan racikan andalanmu, langsung tayang untuk pemancing lain."}
            action={<Link href="/bagikan" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-sm font-bold text-white"><Plus size={16} /> Bagikan Resep</Link>} />
          {resepSaya.length ? (
            <div className="grid gap-4">
              {resepSaya.map((resep) => (
                <article key={resep.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e6eae3] bg-white p-5">
                  <div className="min-w-52">
                    <Link href={`/resep/${resep.slug}`} className="text-base font-extrabold text-[#223528] hover:underline">{resep.title}</Link>
                    <p className="mt-1 text-xs text-[#7c857c]">Diperbarui {formatTanggal(String(resep.updatedAt))} · <span className="font-bold text-[#3f6247]">{labelStatusResep[resep.status] ?? resep.status}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/bagikan/${resep.id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#eef3ea] px-3.5 text-sm font-bold text-[#2f5b3a]"><Pencil size={15} /> Sunting</Link>
                    <button type="button" onClick={() => void hapusResep(resep.id, resep.title)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#fbf0ec] px-3.5 text-sm font-bold text-[#8a4433]"><Trash2 size={15} /> Hapus</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#dce4d9] bg-white p-8 text-center">
              <h2 className="text-lg font-extrabold text-[#304133]">Belum ada resep yang dibagikan</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#636d63]">Punya racikan yang sering strike? Bagikan bahan dan langkahnya, resepmu langsung tayang di katalog.</p>
              <Link href="/bagikan" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white"><Plus size={16} /> Bagikan resep pertama</Link>
            </div>
          )}
        </section>
      ) : tab === "ulasan" ? (
        <section className="pt-8">
          <SectionHeader eyebrow="Pengalamanmu" title="Ulasan Saya" subtitle="Ulasan yang kamu kirim saat masuk. Yang disetujui tampil di halaman resep." />
          {ulasanSaya.length ? (
            <div className="grid gap-4">
              {ulasanSaya.map((ulasan) => (
                <article key={ulasan.id} className="rounded-[22px] border border-[#e6eae3] bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/resep/${ulasan.recipeSlug}`} className="font-extrabold text-[#223528] hover:underline">{ulasan.recipeTitle}</Link>
                    <span className="rounded-full bg-[#eef3ea] px-2.5 py-1 text-xs font-bold text-[#3f6247]">{labelStatusUlasan[ulasan.status] ?? ulasan.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#7c857c]">{formatTanggal(ulasan.createdAt)}{ulasan.location ? ` · ${ulasan.location}` : ""} · {"★".repeat(ulasan.rating)}{"☆".repeat(Math.max(0, 5 - ulasan.rating))}</p>
                  <p className="mt-2 text-sm leading-6 text-[#4b5b4e]">{ulasan.comment}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#dce4d9] bg-white p-8 text-center">
              <h2 className="text-lg font-extrabold text-[#304133]">Belum ada ulasan dari akun ini</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#636d63]">Coba resep di katalog, lalu ceritakan hasil pancingmu di halaman resepnya. Pastikan kamu masuk agar ulasan tercatat di sini.</p>
              <Link href="/katalog" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white">Buka katalog</Link>
            </div>
          )}
        </section>
      ) : (
        <section id="favorit" className="scroll-mt-24 pt-8">
          <SectionHeader eyebrow="Koleksi pribadi" title="Resep Favorit" subtitle={`${savedRecipes.length} racikan tersimpan dan tersinkron ke akunmu.`}
            action={favoriteSlugs.length > 0 ? <button type="button" onClick={hapusSemuaFavorit} className="text-sm font-bold text-[#945c47] hover:underline">Hapus semua</button> : undefined} />
          {savedRecipes.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{savedRecipes.map((recipe) => <RecipeCard key={recipe.slug} recipe={recipe} />)}</div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#dce4d9] bg-white p-8 text-center">
              <h2 className="text-lg font-extrabold text-[#304133]">Belum ada resep favorit</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#636d63]">Ketuk ikon hati pada racikan yang ingin kamu coba. Favoritmu tersimpan di akun dan muncul di perangkat mana pun.</p>
              <Link href="/katalog" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white">Cari racikan</Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
