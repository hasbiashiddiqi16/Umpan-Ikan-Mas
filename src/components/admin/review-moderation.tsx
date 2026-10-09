"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, Clock3, MessageSquareText, Search, ShieldCheck, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/shared";

export type ModeratedReview = { id: number; recipeSlug: string; name: string; location: string; rating: number; weather: string; water: string; fishingType: string; catchCount: number | null; comment: string; status: string; createdAt: string };
const tabs = ["Semua", "pending", "approved", "rejected"];
function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Baru saja" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date); }

function ReviewStars({ rating }: { rating: number }) { return <span className="inline-flex items-center gap-0.5" aria-label={`${rating} dari 5 bintang`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={13} fill={value <= rating ? "currentColor" : "none"} className={value <= rating ? "text-[#d4a244]" : "text-[#d9ddd7]"} />)}</span>; }

export function ReviewModeration() {
  const [rows, setRows] = useState<ModeratedReview[]>([]);
  const [active, setActive] = useState("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/reviews", { cache: "no-store", signal: controller.signal })
        .then(async (response) => { const body = await response.json() as { reviews?: ModeratedReview[]; error?: string }; if (!response.ok) throw new Error(body.error ?? "Ulasan tidak dapat dimuat."); return body; })
        .then((body) => setRows(body.reviews ?? []))
        .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Ulasan tidak dapat dimuat."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);

  const counts = useMemo(() => ({ pending: rows.filter((row) => row.status === "pending").length, approved: rows.filter((row) => row.status === "approved").length, rejected: rows.filter((row) => row.status === "rejected").length }), [rows]);
  const filtered = useMemo(() => rows.filter((row) => (active === "Semua" || row.status === active) && `${row.name} ${row.location} ${row.recipeSlug} ${row.comment}`.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID"))), [active, query, rows]);

  async function moderate(review: ModeratedReview, status: "pending" | "approved" | "rejected") {
    setBusyId(review.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Status ulasan gagal diperbarui.");
      setRows((current) => current.map((item) => item.id === review.id ? { ...item, status } : item));
      setNotice(status === "approved" ? "Ulasan disetujui dan akan terlihat publik." : "Ulasan ditolak dan disembunyikan dari publik.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Moderasi gagal."); }
    finally { setBusyId(null); }
  }

  return (
    <AdminShell>
      <div className="mb-7"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#899488]"><Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Moderasi</span></div><h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Ulasan komunitas</h1><p className="mt-2 text-sm text-[#7a8579]">Tinjau pengalaman pemancing sebelum ulasan tampil di halaman resep publik.</p></div>
      <div className="mb-5 grid grid-cols-3 gap-3"><div className="rounded-2xl border border-[#e9e7dc] bg-white p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#faf3e3] text-[#92763b]"><Clock3 size={16} /></span><p className="mt-3 text-2xl font-black text-[#364539]">{counts.pending}</p><p className="mt-1 text-[10px] font-semibold text-[#92998f]">Menunggu</p></div><div className="rounded-2xl border border-[#e4eae1] bg-white p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf4e9] text-[#51754f]"><CheckCheck size={16} /></span><p className="mt-3 text-2xl font-black text-[#364539]">{counts.approved}</p><p className="mt-1 text-[10px] font-semibold text-[#92998f]">Disetujui</p></div><div className="rounded-2xl border border-[#e8e8e4] bg-white p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f1f2ef] text-[#7c8479]"><ThumbsDown size={16} /></span><p className="mt-3 text-2xl font-black text-[#364539]">{counts.rejected}</p><p className="mt-1 text-[10px] font-semibold text-[#92998f]">Ditolak</p></div></div>
      {notice && <p role="status" className="mb-4 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs font-semibold text-[#436444]">{notice}</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}
      <section className="overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white"><div className="flex flex-col gap-3 border-b border-[#eef0ec] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-sm font-extrabold text-[#344638]">Kotak masuk ulasan</h2><p className="mt-1 text-[10px] text-[#929a91]">Setiap ulasan dikirim ke server dengan status pending.</p></div><label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#e4e9e2] px-3 sm:w-72"><Search size={15} className="text-[#929a91]" /><span className="sr-only">Cari ulasan</span><input className="w-full bg-transparent text-xs outline-none placeholder:text-[#a0a79f]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari penulis, resep, komentar…" /></label></div><div className="flex gap-2 overflow-x-auto">{tabs.map((tab) => <button key={tab} type="button" aria-pressed={active === tab} onClick={() => setActive(tab)} className={`min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold transition ${active === tab ? "bg-[#294b34] text-white" : "bg-[#f3f5f1] text-[#667366]"}`}>{tab === "Semua" ? `Semua · ${rows.length}` : tab === "pending" ? `Menunggu · ${counts.pending}` : tab === "approved" ? `Disetujui · ${counts.approved}` : `Ditolak · ${counts.rejected}`}</button>)}</div></div>
        {loading ? <div className="grid gap-3 p-4">{[0, 1].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-[#f1f4ef]" />)}</div> : filtered.length ? <div className="divide-y divide-[#eff1ed]">{filtered.map((review) => <article key={review.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf2e9] text-xs font-extrabold text-[#4e664e">{review.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="text-sm font-extrabold text-[#344638]">{review.name}</h3><span className="text-[10px] text-[#969d94]">· {review.location} · {dateLabel(review.createdAt)}</span></div><div className="mt-1.5 flex flex-wrap items-center gap-2"><ReviewStars rating={review.rating} /><Badge tone={review.status === "pending" ? "gold" : review.status === "approved" ? "sage" : "cream"}>{review.status === "pending" ? "Menunggu" : review.status === "approved" ? "Disetujui" : "Ditolak"}</Badge></div><div className="mt-3 flex flex-wrap gap-1.5"><Badge>{review.weather === "Hujan" ? "🌧️" : review.weather === "Cerah" ? "☀️" : "☁️"} {review.weather}</Badge><Badge tone="cream">💧 {review.water}</Badge><Badge tone="cream">🎣 {review.fishingType}</Badge>{review.catchCount !== null && <Badge tone="cream">🐟 {review.catchCount} ekor</Badge>}</div><p className="mt-3 text-sm leading-6 text-[#667267]">“{review.comment}”</p><p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#8e978b]"><MessageSquareText size={12} /> resep: {review.recipeSlug}</p></div><div className="flex shrink-0 gap-2 md:flex-col">{review.status !== "approved" && <button type="button" disabled={busyId === review.id} onClick={() => void moderate(review, "approved")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#eaf2e7] px-3 text-[10px] font-bold text-[#426744] hover:bg-[#dcebd8] disabled:opacity-50"><ThumbsUp size={13} />Setujui</button>}{review.status !== "rejected" && <button type="button" disabled={busyId === review.id} onClick={() => void moderate(review, "rejected")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#eee5e1] px-3 text-[10px] font-bold text-[#9c6551] hover:bg-[#fbf2ee] disabled:opacity-50"><ThumbsDown size={13} />Tolak</button>}{review.status !== "pending" && <button type="button" disabled={busyId === review.id} onClick={() => void moderate(review, "pending")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e7eae4] px-3 text-[10px] font-bold text-[#738073] hover:bg-[#f5f7f3] disabled:opacity-50"><ShieldCheck size={13} />Reset</button>}</div></div></article>)}</div> : <div className="grid min-h-64 place-items-center px-6 py-12 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f4ee] text-[#6f806d]"><MessageSquareText size={20} /></span><h3 className="mt-4 text-sm font-extrabold text-[#3b4b3d]">{rows.length ? "Tidak ada ulasan pada filter ini" : "Belum ada ulasan kiriman"}</h3><p className="mt-1.5 text-xs leading-5 text-[#8a9389]">{rows.length ? "Coba filter status atau kata kunci yang lain." : "Ulasan baru yang dikirim dari detail resep akan masuk ke antrean moderasi ini."}</p><Link href="/katalog" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#4f724f]">Buka katalog <ArrowRightSmall /></Link></div></div>}
        <div className="flex items-center gap-2 border-t border-[#eef0ec] bg-[#fafbf9] px-4 py-3 text-[9px] text-[#959c93] sm:px-5"><ShieldCheck size={12} /> Hanya ulasan berstatus approved yang terlihat pada resep publik.</div>
      </section>
    </AdminShell>
  );
}

function ArrowRightSmall() { return <span aria-hidden="true">→</span>; }
