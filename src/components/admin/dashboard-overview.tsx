"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, Eye, FileText, MessageSquareText, Plus, RefreshCw, Send, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminCan, useAdminMe } from "@/components/admin/use-admin-me";
import { BAYESIAN_MIN_REVIEWS } from "@/lib/rating-utils";
import { ChartHeading, ContentDonutChart, TopPagesChart, TrafficLineChart, type DailyAnalytic, type TopPage } from "@/components/admin/analytics-charts";
import { Badge } from "@/components/shared";

export type AnalyticsPayload = {
  views: number;
  previousViews: number;
  change: number | null;
  contentTotal: number;
  published: number;
  drafts: number;
  archived: number;
  pendingReviews: number;
  approvedReviews: number;
  /** Ulasan pengunjung — sumber angka peringkat katalog. */
  visitorReviewCount: number;
  visitorReviewAverage: number;
  /** Ambang m pada skor Bayesian yang dipakai pemeringkatan. */
  minReviews: number;
  daily: DailyAnalytic[];
  topPages: TopPage[];
  range: string;
  generatedAt: string;
};

type RecentContent = { id: number; title: string; status: string; category: string; updatedAt: string };
const numberFormat = new Intl.NumberFormat("id-ID");

function MetricCard({ title, value, description, icon: Icon, tone, change }: { title: string; value: number | string; description: string; icon: typeof Eye; tone: string; change?: number | null }) {
  return <article className="rounded-[19px] border border-[#e7ebe5] bg-white p-4 shadow-[0_3px_12px_rgba(36,53,39,.025)] sm:p-5"><div className="flex items-start justify-between gap-3"><span className="text-[11px] font-semibold text-[#636c62] (4.68:1 terburuk)">{title}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon size={17} /></span></div><p className="mt-4 text-[1.8rem] font-black tracking-[-.04em] text-[#283b2d] sm:text-[2rem]">{typeof value === "number" ? numberFormat.format(value) : value}</p><div className="mt-2 flex min-h-5 items-center gap-1.5 text-[10px] leading-4 text-[#656c63] (4.64:1 terburuk)">{change !== undefined && change !== null ? <span className={`inline-flex items-center gap-0.5 font-bold ${change >= 0 ? "text-[#4b7348] (4.69:1 terburuk)" : "text-[#9a5949] (4.62:1 terburuk)"}`}>{change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(change)}%</span> : null}<span>{description}</span></div></article>;
}

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Baru saja" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function DashboardOverview() {
  const me = useAdminMe();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  // Statistik inti dihitung dari daftar resep & ulasan (terbaca semua peran).
  // Data kunjungan dari /api/admin/analytics khusus Pemilik & Editor, jadi
  // peran lain tidak lagi melihat Ringkasan serba kosong.
  const [contentStats, setContentStats] = useState<{ total: number; published: number; drafts: number; archived: number } | null>(null);
  const [reviewStats, setReviewStats] = useState<{ pending: number; approved: number } | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentContent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const canAnalytics = adminCan(me, "analitik");

  const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/analytics", { cache: "no-store", signal });
    if (!response.ok) throw new Error("Analitik belum dapat dimuat.");
    const payload = await response.json() as AnalyticsPayload;
    setData(payload);
  }, []);

  // Data inti Ringkasan: jumlah konten per status, jumlah ulasan, dan aktivitas
  // terbaru. Kedua endpoint ini terbaca semua peran admin, jadi Moderator dan
  // Hanya-lihat pun melihat angka yang sebenarnya.
  const loadCore = useCallback(async (signal?: AbortSignal) => {
    let gagal = false;
    const [recipesResult, reviewsResult] = await Promise.allSettled([
      fetch("/api/admin/recipes", { cache: "no-store", signal }).then(async (response) => {
        if (!response.ok) throw new Error("Konten belum dapat dimuat.");
        return response.json() as Promise<{ recipes?: (RecentContent & { status: string })[] }>;
      }),
      fetch("/api/admin/reviews", { cache: "no-store", signal }).then(async (response) => {
        if (!response.ok) throw new Error("Ulasan belum dapat dimuat.");
        return response.json() as Promise<{ reviews?: { status: string }[] }>;
      }),
    ]);
    if (recipesResult.status === "fulfilled") {
      const recipes = recipesResult.value.recipes ?? [];
      setRecent(recipes.slice(0, 5));
      setContentStats({
        total: recipes.length,
        published: recipes.filter((item) => item.status === "published").length,
        drafts: recipes.filter((item) => item.status === "draft").length,
        archived: recipes.filter((item) => item.status === "archived").length,
      });
    } else gagal = true;
    if (reviewsResult.status === "fulfilled") {
      const reviews = reviewsResult.value.reviews ?? [];
      setReviewStats({
        pending: reviews.filter((item) => item.status === "pending").length,
        approved: reviews.filter((item) => item.status === "approved").length,
      });
    } else gagal = true;
    if (gagal) setError("Sebagian data dashboard belum tersedia. Coba muat ulang.");
    else setLoadedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadCore(controller.signal).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadCore]);

  // Data kunjungan hanya diminta bila peran memang berhak melihatnya; peran
  // lain tidak memicu penolakan 403 yang dulu mengosongkan seluruh Ringkasan.
  useEffect(() => {
    if (!me || !canAnalytics) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      loadAnalytics(controller.signal).catch(() => { if (!controller.signal.aborted) setError("Analitik belum dapat dimuat. Periksa koneksi lalu coba lagi."); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [me, canAnalytics, loadAnalytics]);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      await loadCore();
      if (canAnalytics) await loadAnalytics().catch(() => setError("Analitik belum dapat dimuat. Periksa koneksi lalu coba lagi."));
    } finally { setRefreshing(false); }
  }

  return (
    <AdminShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#656d64] (4.59:1 terburuk)">Rabu · Content studio</p><h1 className="mt-1 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Selamat datang</h1><p className="mt-2 text-sm text-[#626c62] (4.69:1 terburuk)">Ringkasan konten dan aktivitas UMPAN MAS.</p></div><div className="flex gap-2"><button type="button" onClick={refresh} disabled={refreshing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#e3e8e1] bg-white px-3.5 text-xs font-bold text-[#59685a] transition hover:bg-[#f6f8f4] disabled:opacity-60"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Segarkan</button>{adminCan(me, "konten") && <Link href="/dashboard/konten?create=1" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-bold text-white transition hover:bg-[#203d29]"><Plus size={15} /> Konten baru</Link>}</div></div>

      {error && <div role="status" className="mb-5 rounded-xl border border-[#eddcc5] bg-[#fbf6ed] px-4 py-3 text-xs font-semibold text-[#7e6845]">{error}</div>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="inline-flex items-center gap-2 text-xs font-bold text-[#4b5b4d]"><Activity size={15} className="text-[#5b7059] (4.61:1 terburuk)" /> Angka aktual dari database</div><span className="text-[10px] text-[#969d94]">{canAnalytics ? "Kunjungan publik · 30 hari terakhir" : "Konten & ulasan · dari database"}</span></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <MetricCard title="Kunjungan halaman" value={canAnalytics ? (data?.views ?? 0) : "—"} description={canAnalytics ? (data?.change === null || data?.change === undefined ? "Belum ada periode pembanding" : "vs. 30 hari sebelumnya") : "Khusus peran Pemilik & Editor"} icon={Eye} tone="bg-[#edf3e9] text-[#52724f]" change={data?.change} />
        <MetricCard title="Total konten CMS" value={contentStats?.total ?? data?.contentTotal ?? 0} description="Resep yang dikelola" icon={FileText} tone="bg-[#f2eee3] text-[#7b6738] (4.69:1 terburuk)" />
        <MetricCard title="Konten tayang" value={contentStats?.published ?? data?.published ?? 0} description="Terlihat di katalog publik" icon={Send} tone="bg-[#e9f1ee] text-[#4a7367] (4.57:1 terburuk)" />
        <MetricCard title="Ulasan siap tampil" value={reviewStats?.approved ?? data?.approvedReviews ?? 0} description={(reviewStats?.pending ?? data?.pendingReviews) ? `${numberFormat.format(reviewStats?.pending ?? data?.pendingReviews ?? 0)} ditahan sistem — perlu keputusanmu` : "Termasuk ulasan katalog tersinkron"} icon={MessageSquareText} tone="bg-[#f7ece7] text-[#915f47] (4.58:1 terburuk)" />
      </div>

      <p className="mt-4 rounded-xl border border-[#e7ebe5] bg-white px-4 py-3 text-[10px] leading-5 text-[#636d62] (4.63:1 terburuk)">
        <strong className="font-extrabold text-[#4b5b4d]">Cara peringkat “Rating Tertinggi” dihitung:</strong> rata-rata Bayesian <span className="font-semibold">v/(v+m)·R + m/(v+m)·C</span> dengan ambang m={data?.minReviews ?? BAYESIAN_MIN_REVIEWS}
        {data && data.visitorReviewCount > 0 ? ` dan rata-rata seluruh ulasan pengunjung (C) ${data.visitorReviewAverage.toFixed(2)} dari ${numberFormat.format(data.visitorReviewCount)} ulasan` : loading ? " — sedang memuat rata-rata seluruh ulasan pengunjung (C) dari database" : me && !canAnalytics ? " — rata-rata seluruh ulasan pengunjung (C) hanya ditampilkan untuk peran Pemilik & Editor" : " — belum ada ulasan pengunjung, jadi belum ada skor yang bisa dihitung"}. Urutan ini bisa dilihat dan dipakai di <Link href="/dashboard/konten" className="font-bold text-[#4e704d] underline-offset-2 hover:underline">Pustaka racikan</Link> lewat pilihan “Skor rating (Bayesian)”.
      </p>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><ChartHeading icon={TrendingUp} label="Tren kunjungan" note="Pergerakan halaman publik setiap hari" />{canAnalytics ? <TrafficLineChart data={data?.daily ?? []} /> : <div className="grid min-h-[180px] place-items-center px-5 text-center"><p className="max-w-xs text-[11px] leading-5 text-[#92998f]">Data kunjungan hanya dapat dilihat peran <strong className="text-[#656d63] (4.64:1 terburuk)">Pemilik</strong> dan <strong className="text-[#656d63] (4.64:1 terburuk)">Editor</strong>. Konten dan ulasan tetap terpantau dari panel lain di halaman ini.</p></div>}</section>
        <section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><ChartHeading icon={Activity} label="Status editorial" note="Sebaran semua resep dalam CMS" /><ContentDonutChart published={contentStats?.published ?? data?.published ?? 0} drafts={contentStats?.drafts ?? data?.drafts ?? 0} archived={contentStats?.archived ?? data?.archived ?? 0} /><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#eef0ec] pt-3 text-center"><div><p className="text-base font-black text-[#3d6745]">{contentStats?.published ?? data?.published ?? 0}</p><p className="text-[9px] text-[#92998f]">Siap dibaca</p></div><div><p className="text-base font-black text-[#816830] (4.55:1 terburuk)">{contentStats?.drafts ?? data?.drafts ?? 0}</p><p className="text-[9px] text-[#92998f]">Disiapkan</p></div><div><p className="text-base font-black text-[#646d62] (4.61:1 terburuk)">{contentStats?.archived ?? data?.archived ?? 0}</p><p className="text-[9px] text-[#92998f]">Diarsipkan</p></div></div></section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><ChartHeading icon={FileText} label="Halaman terpopuler" note="Diukur berdasarkan page view 30 hari" />{canAnalytics ? <TopPagesChart pages={data?.topPages ?? []} /> : <div className="grid min-h-[160px] place-items-center px-5 text-center"><p className="max-w-xs text-[11px] leading-5 text-[#92998f]">Peringkat halaman hanya dapat dilihat peran <strong className="text-[#656d63] (4.64:1 terburuk)">Pemilik</strong> dan <strong className="text-[#656d63] (4.64:1 terburuk)">Editor</strong>.</p></div>}</section>
        <section className="overflow-hidden rounded-[20px] border border-[#e7ebe5] bg-white">
          <div className="flex items-center justify-between px-4 py-4 sm:px-5"><div><h2 className="text-sm font-extrabold text-[#354638]">Aktivitas konten terbaru</h2><p className="mt-1 text-[10px] text-[#91998e]">Perubahan terakhir di Content Studio</p></div><Link href="/dashboard/konten" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4e704d] hover:underline">Semua konten <ArrowRight size={12} /></Link></div>
          {recent.length ? <div className="divide-y divide-[#eff1ed]">{recent.map((item) => <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f2f5ef] text-[#587155] (4.61:1 terburuk)"><FileText size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#3b4b3c]">{item.title}</p><p className="mt-1 text-[10px] text-[#949b92]">{item.category} · {formattedDate(item.updatedAt)}</p></div><Badge tone={item.status === "published" ? "sage" : item.status === "draft" ? "gold" : "cream"}>{item.status === "published" ? "Tayang" : item.status === "draft" ? "Draft" : "Arsip"}</Badge></div>)}</div> : <div className="grid min-h-[180px] place-items-center px-5 text-center"><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#f3f6f1] text-[#616f5f] (4.56:1 terburuk)"><Clock3 size={18} /></span><p className="mt-3 text-xs font-bold text-[#5c695d]">Belum ada aktivitas konten</p><p className="mt-1 text-[10px] text-[#969d94]">Buat resep pertama untuk memulai.</p><Link href="/dashboard/konten?create=1" className="mt-3 inline-flex text-[10px] font-bold text-[#4f724f]">Tulis konten <ArrowUpRight size={12} /></Link></div></div>}
          <div className="flex items-center gap-2 border-t border-[#eff1ed] bg-[#fafbf9] px-4 py-3 text-[10px] text-[#676d65] (4.56:1 terburuk) sm:px-5"><Clock3 size={12} />{loading ? "Memuat data…" : `Diperbarui ${data ? formattedDate(data.generatedAt) : loadedAt ? formattedDate(loadedAt) : "—"}`}</div>
        </section>
      </div>
      <p className="mt-4 text-[10px] leading-5 text-[#92998f]">Analitik menghitung page view, bukan pengunjung unik. Hindari memasukkan data pribadi ke konten publik.</p>
    </AdminShell>
  );
}
