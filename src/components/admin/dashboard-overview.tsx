"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, Eye, FileText, MessageSquareText, Plus, RefreshCw, Send, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
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
  daily: DailyAnalytic[];
  topPages: TopPage[];
  range: string;
  generatedAt: string;
};

type RecentContent = { id: number; title: string; status: string; category: string; updatedAt: string };
const numberFormat = new Intl.NumberFormat("id-ID");

function MetricCard({ title, value, description, icon: Icon, tone, change }: { title: string; value: number | string; description: string; icon: typeof Eye; tone: string; change?: number | null }) {
  return <article className="rounded-[19px] border border-[#e7ebe5] bg-white p-4 shadow-[0_3px_12px_rgba(36,53,39,.025)] sm:p-5"><div className="flex items-start justify-between gap-3"><span className="text-[11px] font-semibold text-[#788276]">{title}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon size={17} /></span></div><p className="mt-4 text-[1.8rem] font-black tracking-[-.04em] text-[#283b2d] sm:text-[2rem]">{typeof value === "number" ? numberFormat.format(value) : value}</p><div className="mt-2 flex min-h-5 items-center gap-1.5 text-[10px] leading-4 text-[#899287]">{change !== undefined && change !== null ? <span className={`inline-flex items-center gap-0.5 font-bold ${change >= 0 ? "text-[#538050]" : "text-[#b56956]"}`}>{change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(change)}%</span> : null}<span>{description}</span></div></article>;
}

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Baru saja" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function DashboardOverview() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [recent, setRecent] = useState<RecentContent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/analytics", { cache: "no-store", signal });
    if (!response.ok) throw new Error("Analitik belum dapat dimuat.");
    const payload = await response.json() as AnalyticsPayload;
    setData(payload);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void Promise.all([
        loadAnalytics(controller.signal),
        fetch("/api/admin/recipes", { cache: "no-store", signal: controller.signal }).then(async (response) => response.ok ? response.json() as Promise<{ recipes?: RecentContent[] }> : { recipes: [] }).then((body) => setRecent((body.recipes ?? []).slice(0, 5))),
      ]).catch(() => { if (!controller.signal.aborted) setError("Sebagian data dashboard belum tersedia. Coba muat ulang."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadAnalytics]);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      await loadAnalytics();
      const response = await fetch("/api/admin/recipes", { cache: "no-store" });
      if (response.ok) { const body = await response.json() as { recipes?: RecentContent[] }; setRecent((body.recipes ?? []).slice(0, 5)); }
    } catch { setError("Analitik belum dapat dimuat. Periksa koneksi lalu coba lagi."); }
    finally { setRefreshing(false); }
  }

  return (
    <AdminShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#899488]">Rabu · Content studio</p><h1 className="mt-1 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Selamat datang 👋</h1><p className="mt-2 text-sm text-[#7a8579]">Ringkasan konten dan aktivitas UMPAN MAS.</p></div><div className="flex gap-2"><button type="button" onClick={refresh} disabled={refreshing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#e3e8e1] bg-white px-3.5 text-xs font-bold text-[#59685a] transition hover:bg-[#f6f8f4] disabled:opacity-60"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Segarkan</button><Link href="/dashboard/konten?create=1" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-bold text-white transition hover:bg-[#203d29]"><Plus size={15} /> Konten baru</Link></div></div>

      {error && <div role="status" className="mb-5 rounded-xl border border-[#eddcc5] bg-[#fbf6ed] px-4 py-3 text-xs font-semibold text-[#7e6845]">{error}</div>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="inline-flex items-center gap-2 text-xs font-bold text-[#4b5b4d]"><Activity size={15} className="text-[#6c8569]" /> Angka aktual dari database</div><span className="text-[10px] text-[#969d94]">Kunjungan publik · 30 hari terakhir</span></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <MetricCard title="Kunjungan halaman" value={data?.views ?? 0} description={data?.change === null || data?.change === undefined ? "Belum ada periode pembanding" : "vs. 30 hari sebelumnya"} icon={Eye} tone="bg-[#edf3e9] text-[#52724f]" change={data?.change} />
        <MetricCard title="Total konten CMS" value={data?.contentTotal ?? 0} description="Resep yang dikelola" icon={FileText} tone="bg-[#f2eee3] text-[#927a42]" />
        <MetricCard title="Konten tayang" value={data?.published ?? 0} description="Terlihat di katalog publik" icon={Send} tone="bg-[#e9f1ee] text-[#4d786b]" />
        <MetricCard title="Ulasan menunggu" value={data?.pendingReviews ?? 0} description="Perlu tinjauan editor" icon={MessageSquareText} tone="bg-[#f7ece7] text-[#9a654c]" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><ChartHeading icon={TrendingUp} label="Tren kunjungan" note="Pergerakan halaman publik setiap hari" /><TrafficLineChart data={data?.daily ?? []} /></section>
        <section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><ChartHeading icon={Activity} label="Status editorial" note="Sebaran semua resep dalam CMS" /><ContentDonutChart published={data?.published ?? 0} drafts={data?.drafts ?? 0} archived={data?.archived ?? 0} /><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#eef0ec] pt-3 text-center"><div><p className="text-base font-black text-[#3d6745]">{data?.published ?? 0}</p><p className="text-[9px] text-[#92998f]">Siap dibaca</p></div><div><p className="text-base font-black text-[#987b39]">{data?.drafts ?? 0}</p><p className="text-[9px] text-[#92998f]">Disiapkan</p></div><div><p className="text-base font-black text-[#889585]">{data?.archived ?? 0}</p><p className="text-[9px] text-[#92998f]">Diarsipkan</p></div></div></section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><ChartHeading icon={FileText} label="Halaman terpopuler" note="Diukur berdasarkan page view 30 hari" /><TopPagesChart pages={data?.topPages ?? []} /></section>
        <section className="overflow-hidden rounded-[20px] border border-[#e7ebe5] bg-white">
          <div className="flex items-center justify-between px-4 py-4 sm:px-5"><div><h2 className="text-sm font-extrabold text-[#354638]">Aktivitas konten terbaru</h2><p className="mt-1 text-[10px] text-[#91998e]">Perubahan terakhir di Content Studio</p></div><Link href="/dashboard/konten" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4e704d] hover:underline">Semua konten <ArrowRight size={12} /></Link></div>
          {recent.length ? <div className="divide-y divide-[#eff1ed]">{recent.map((item) => <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f2f5ef] text-[#648060]"><FileText size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#3b4b3c]">{item.title}</p><p className="mt-1 text-[10px] text-[#949b92]">{item.category} · {formattedDate(item.updatedAt)}</p></div><Badge tone={item.status === "published" ? "sage" : item.status === "draft" ? "gold" : "cream"}>{item.status === "published" ? "Tayang" : item.status === "draft" ? "Draft" : "Arsip"}</Badge></div>)}</div> : <div className="grid min-h-[180px] place-items-center px-5 text-center"><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#f3f6f1] text-[#758773]"><Clock3 size={18} /></span><p className="mt-3 text-xs font-bold text-[#5c695d]">Belum ada aktivitas konten</p><p className="mt-1 text-[10px] text-[#969d94]">Buat resep pertama untuk memulai.</p><Link href="/dashboard/konten?create=1" className="mt-3 inline-flex text-[10px] font-bold text-[#4f724f]">Tulis konten <ArrowUpRight size={12} /></Link></div></div>}
          <div className="flex items-center gap-2 border-t border-[#eff1ed] bg-[#fafbf9] px-4 py-3 text-[10px] text-[#8f978d] sm:px-5"><Clock3 size={12} />{loading ? "Memuat data…" : `Diperbarui ${data ? formattedDate(data.generatedAt) : "—"}`}</div>
        </section>
      </div>
      <p className="mt-4 text-[10px] leading-5 text-[#92998f]">Analitik menghitung page view, bukan pengunjung unik. Hindari memasukkan data pribadi ke konten publik. Rute dashboard MVP ini belum memakai login.</p>
    </AdminShell>
  );
}
