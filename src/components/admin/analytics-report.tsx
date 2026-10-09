"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, Eye, FileText, Gauge, RefreshCw, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ChartHeading, ContentDonutChart, TopPagesChart } from "@/components/admin/analytics-charts";
import { TrafficLineChart } from "@/components/admin/analytics-charts";
import type { AnalyticsPayload } from "@/components/admin/dashboard-overview";

const periods = [7, 30, 90];
const numberFormat = new Intl.NumberFormat("id-ID");

export function AnalyticsReport() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      void fetch(`/api/admin/analytics?days=${period}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => { const body = await response.json() as AnalyticsPayload & { error?: string }; if (!response.ok) throw new Error(body.error ?? "Analitik belum dapat dimuat."); return body; })
        .then((payload) => setData(payload))
        .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Analitik belum dapat dimuat."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [period, refreshToken]);

  const average = useMemo(() => data ? Math.round(data.views / period) : 0, [data, period]);
  const topRecipeViews = data?.topPages.filter((page) => page.path.startsWith("/resep/")).reduce((sum, page) => sum + page.views, 0) ?? 0;
  const maxTop = Math.max(...(data?.topPages.map((page) => page.views) ?? [0]), 1);

  return (
    <AdminShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#899488]"><Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Analitik</span></div><h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Performa konten</h1><p className="mt-2 text-sm text-[#7a8579]">Pantau apa yang dibaca pemancing dan bagaimana pustaka CMS berkembang.</p></div><button type="button" onClick={() => setRefreshToken((value) => value + 1)} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#e3e8e1] bg-white px-3.5 text-xs font-bold text-[#59685a] hover:bg-[#f6f8f4] sm:self-auto"><RefreshCw size={14} /> Segarkan data</button></div>
      <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-[#e5eae3] bg-white p-4 sm:flex-row sm:items-center sm:px-5"><div><p className="text-xs font-extrabold text-[#435445]">Rentang analisis</p><p className="mt-1 text-[10px] text-[#949b92]">Bandingkan dengan periode sebelumnya yang sama panjang.</p></div><div className="flex gap-2">{periods.map((days) => <button key={days} type="button" aria-pressed={period === days} onClick={() => setPeriod(days)} className={`min-h-9 rounded-lg px-4 text-xs font-bold transition ${period === days ? "bg-[#294b34] text-white" : "bg-[#f2f5f0] text-[#687568] hover:bg-[#e8eee5]"}`}>{days} hari</button>)}</div></div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</div>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><article className="rounded-[18px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3e9] text-[#52724f]"><Eye size={17} /></span><p className="mt-3 text-[10px] font-bold text-[#879085]">Page view</p><p className="mt-1 text-2xl font-black text-[#2d402f]">{loading ? "—" : numberFormat.format(data?.views ?? 0)}</p><div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#8b9489]">{data?.change !== null && data?.change !== undefined ? <>{data.change >= 0 ? <ArrowUpRight size={12} className="text-[#568050]" /> : <ArrowDownRight size={12} className="text-[#b56956]" />}{Math.abs(data.change)}% dibanding sebelumnya</> : "Belum ada pembanding"}</div></article>
        <article className="rounded-[18px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf1ee] text-[#4d786b]"><Gauge size={17} /></span><p className="mt-3 text-[10px] font-bold text-[#879085]">Rata-rata kunjungan / hari</p><p className="mt-1 text-2xl font-black text-[#2d402f]">{loading ? "—" : numberFormat.format(average)}</p><p className="mt-1 text-[10px] text-[#8b9489]">Selama {period} hari</p></article>
        <article className="rounded-[18px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3eee2] text-[#967c43]"><FileText size={17} /></span><p className="mt-3 text-[10px] font-bold text-[#879085]">Resep CMS tayang</p><p className="mt-1 text-2xl font-black text-[#2d402f]">{loading ? "—" : numberFormat.format(data?.published ?? 0)}</p><p className="mt-1 text-[10px] text-[#8b9489]">Dari {numberFormat.format(data?.contentTotal ?? 0)} konten</p></article>
        <article className="rounded-[18px] border border-[#e7ebe5] bg-white p-4 sm:p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f7ece7] text-[#9a654c]"><TrendingUp size={17} /></span><p className="mt-3 text-[10px] font-bold text-[#879085]">Tampilan detail resep</p><p className="mt-1 text-2xl font-black text-[#2d402f]">{loading ? "—" : numberFormat.format(topRecipeViews)}</p><p className="mt-1 text-[10px] text-[#8b9489]">Dari 6 halaman teratas</p></article></div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_.85fr]"><section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5 lg:p-6"><ChartHeading icon={ChartNoAxesCombined} label={`Tren kunjungan · ${period} hari`} note="Kunjungan harian pada semua halaman publik" /><TrafficLineChart data={data?.daily ?? []} /></section><section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5 lg:p-6"><ChartHeading icon={FileText} label="Pustaka editorial" note="Komposisi konten menurut status" /><ContentDonutChart published={data?.published ?? 0} drafts={data?.drafts ?? 0} archived={data?.archived ?? 0} /><div className="mt-5 rounded-xl bg-[#f5f7f3] p-3 text-[10px] leading-5 text-[#7e887d]">Simpan konten sebagai draft saat masih disunting; status tayang dapat diubah kapan saja melalui CMS.</div></section></div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]"><section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5 lg:p-6"><ChartHeading icon={Eye} label="Halaman paling banyak dibuka" note="Page view menurut rute halaman" /><TopPagesChart pages={data?.topPages ?? []} /></section><section className="rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5 lg:p-6"><ChartHeading icon={TrendingUp} label="Porsi halaman populer" note="Perbandingan tampilan halaman teratas pada periode ini" />{data?.topPages.length ? <div className="mt-6 space-y-4">{data.topPages.slice(0, 5).map((page, index) => <div key={page.path} className="grid grid-cols-[minmax(100px,.7fr)_1.3fr_42px] items-center gap-3"><span className="truncate text-[10px] font-semibold text-[#667366]">{page.path}</span><div className="h-3 overflow-hidden rounded-full bg-[#eff2ec]"><div className={`h-full rounded-full ${index === 0 ? "bg-[#355f3d]" : index === 1 ? "bg-[#648664]" : "bg-[#a1b294]"}`} style={{ width: `${Math.max(3, (page.views / maxTop) * 100)}%` }} /></div><span className="text-right text-[10px] font-bold tabular-nums text-[#536254]">{page.views}</span></div>)}</div> : <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-[#e4e9e2] px-5 text-center text-xs leading-5 text-[#899287]">Belum ada page view dalam rentang ini. Kunjungan baru akan memperbarui grafik otomatis.</div>}</section></div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#e6eae3] bg-[#f6f8f4] px-4 py-3 text-[10px] leading-5 text-[#7c867b]"><Eye size={13} className="mt-0.5 shrink-0" />Data adalah page view, bukan identitas atau jumlah pengunjung unik. Tracker tidak menyimpan nama, email, alamat IP, atau cookie identitas.</div>
    </AdminShell>
  );
}
