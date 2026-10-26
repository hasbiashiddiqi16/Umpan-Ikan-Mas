"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, Clock3, MessageSquareText, Search, ShieldCheck, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminCan, useAdminMe } from "@/components/admin/use-admin-me";
import { Badge, CatchIcon, FishingTypeIcon, WaterBodyIcon, WaterIcon, WeatherIcon } from "@/components/shared";
import { catchBadges } from "@/lib/catch-details";

export type ModeratedReview = { id: number; recipeSlug: string; name: string; location: string; rating: number; weather: string; water: string; fishingType: string; waterBody: string | null; catchCount: number | null; sessionMinutes: number | null; rodCount: number | null; comment: string; status: string; holdReason: string | null; laporanTerbuka: number; createdAt: string };
const tabs = ["Semua", "dilaporkan", "pending", "approved", "rejected"];
function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Baru saja" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date); }

function ReviewStars({ rating }: { rating: number }) { return <span className="inline-flex items-center gap-0.5" aria-label={`${rating} dari 5 bintang`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={13} fill={value <= rating ? "currentColor" : "none"} className={value <= rating ? "text-[#d4a244]" : "text-[#d9ddd7]"} />)}</span>; }

export function ReviewModeration() {
  const me = useAdminMe();
  // Peran tanpa kapabilitas moderasi (mis. Hanya-lihat): daftar tetap terbaca,
  // tetapi semua tombol keputusan dinonaktifkan. Server tetap penegak utama.
  const canModerate = adminCan(me, "moderasi");
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
        .then((body) => { setRows(body.reviews ?? []); })
        .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Ulasan tidak dapat dimuat."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);

  const counts = useMemo(() => ({ dilaporkan: rows.filter((row) => row.laporanTerbuka > 0).length, pending: rows.filter((row) => row.status === "pending").length, approved: rows.filter((row) => row.status === "approved").length, rejected: rows.filter((row) => row.status === "rejected").length }), [rows]);
  const filtered = useMemo(() => rows.filter((row) => (active === "Semua" || (active === "dilaporkan" ? row.laporanTerbuka > 0 : row.status === active)) && `${row.name} ${row.location} ${row.recipeSlug} ${row.comment}`.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID"))), [active, query, rows]);

  async function moderate(review: ModeratedReview, status: "pending" | "approved" | "rejected") {
    setBusyId(review.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Status ulasan gagal diperbarui.");
      setRows((current) => current.map((item) => item.id === review.id ? { ...item, status, laporanTerbuka: 0 } : item));
      setNotice(status === "approved" ? "Ulasan disetujui dan kini tampil publik." : status === "rejected" ? "Ulasan ditolak dan disembunyikan dari publik." : "Ulasan dikembalikan ke antrean Ditahan.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Moderasi gagal."); }
    finally { setBusyId(null); }
  }

  async function abaikanLaporan(review: ModeratedReview) {
    setBusyId(review.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ laporan: "abaikan" }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Laporan gagal diabaikan.");
      setRows((current) => current.map((item) => item.id === review.id ? { ...item, laporanTerbuka: 0 } : item));
      setNotice("Laporan pengunjung diabaikan. Ulasan tetap tampil seperti semula.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Laporan gagal diabaikan."); }
    finally { setBusyId(null); }
  }

  return (
    <AdminShell>
      <div className="mb-7"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#656d64] (4.59:1 terburuk)"><Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Moderasi</span></div><h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Moderasi ulasan</h1><p className="mt-2 text-sm text-[#626c62] (4.69:1 terburuk)">Ulasan bersih tampil otomatis. Halaman ini meninjau kiriman yang ditahan sistem dan menindaklanjuti yang sudah tampil.</p></div>
      <div className="mb-5 grid grid-cols-3 gap-3"><div className="rounded-2xl border border-[#e9e7dc] bg-white p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#faf3e3] text-[#7e6633] (4.70:1 terburuk)"><Clock3 size={16} /></span><p className="mt-3 text-2xl font-black text-[#364539]">{counts.pending}</p><p className="mt-1 text-[10px] font-semibold text-[#92998f]">Ditahan</p></div><div className="rounded-2xl border border-[#e4eae1] bg-white p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf4e9] text-[#4f734d] (4.63:1 terburuk)"><CheckCheck size={16} /></span><p className="mt-3 text-2xl font-black text-[#364539]">{counts.approved}</p><p className="mt-1 text-[10px] font-semibold text-[#92998f]">Disetujui</p></div><div className="rounded-2xl border border-[#e8e8e4] bg-white p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f1f2ef] text-[#676d64] (4.56:1 terburuk)"><ThumbsDown size={16} /></span><p className="mt-3 text-2xl font-black text-[#364539]">{counts.rejected}</p><p className="mt-1 text-[10px] font-semibold text-[#92998f]">Ditolak</p></div></div>
      {!canModerate && me && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-[#e9e4cf] bg-[#fbf7e8] px-4 py-3 text-xs leading-5 text-[#7a6535]"><ShieldCheck size={15} className="mt-0.5 shrink-0" /><span><strong>Mode hanya-lihat.</strong> Peran Anda ({me.roleLabel}) dapat membaca antrean ulasan ini, tetapi tidak dapat mengambil keputusan — tombol Setujui, Tolak, Tahan, dan Abaikan laporan dinonaktifkan.</span></p>
      )}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs leading-5 text-[#436444]"><ShieldCheck size={15} className="mt-0.5 shrink-0" /><p><strong>Moderasi berbasis risiko aktif.</strong> Ulasan bersih langsung tampil otomatis tanpa menunggumu. Tab <strong>Ditahan</strong> hanya berisi kiriman yang ditahan pemeriksaan sistem. Setujui untuk menerbitkannya atau tolak untuk menyembunyikannya. Ulasan yang sudah tampil tetap bisa ditolak dari tab Disetujui. Pengunjung juga dapat melaporkan ulasan yang tampil lewat tombol <strong>Laporkan</strong>. Ulasan dengan laporan terbuka muncul di tab <strong>Dilaporkan</strong>, dan tiga pelapor berbeda menahannya otomatis sampai kamu memutuskan.</p></div>
      {notice && <p role="status" className="mb-4 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs font-semibold text-[#436444]">{notice}</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}
      <section className="overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white"><div className="flex flex-col gap-3 border-b border-[#eef0ec] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-sm font-extrabold text-[#344638]">Daftar ulasan komunitas</h2><p className="mt-1 text-[10px] text-[#929a91]">Hanya ulasan yang ditahan pemeriksaan otomatis yang menunggu keputusan di sini.</p></div><label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#e4e9e2] px-3 sm:w-72"><Search size={15} className="text-[#929a91]" /><span className="sr-only">Cari ulasan</span><input className="w-full bg-transparent text-xs outline-none placeholder:text-[#a0a79f]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari penulis, resep, komentar…" /></label></div><div className="flex gap-2 overflow-x-auto">{tabs.map((tab) => <button key={tab} type="button" aria-pressed={active === tab} onClick={() => setActive(tab)} className={`min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold transition ${active === tab ? "bg-[#294b34] text-white" : "bg-[#f3f5f1] text-[#626e62] (4.59:1 terburuk)"}`}>{tab === "Semua" ? `Semua · ${rows.length}` : tab === "pending" ? `Ditahan · ${counts.pending}` : tab === "dilaporkan" ? `Dilaporkan · ${counts.dilaporkan}` : tab === "approved" ? `Disetujui · ${counts.approved}` : `Ditolak · ${counts.rejected}`}</button>)}</div></div>
        {loading ? <div className="grid gap-3 p-4">{[0, 1].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-[#f1f4ef]" />)}</div> : filtered.length ? <div className="divide-y divide-[#eff1ed]">{filtered.map((review) => <article key={review.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf2e9] text-xs font-extrabold text-[#4e664e">{review.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="text-sm font-extrabold text-[#344638]">{review.name}</h3><span className="text-[10px] text-[#969d94]">· {review.location} · {dateLabel(review.createdAt)}</span></div><div className="mt-1.5 flex flex-wrap items-center gap-2"><ReviewStars rating={review.rating} /><Badge tone={review.status === "pending" ? "gold" : review.status === "approved" ? "sage" : "cream"}>{review.status === "pending" ? "Ditahan" : review.status === "approved" ? "Disetujui" : "Ditolak"}</Badge>{review.laporanTerbuka > 0 && <Badge tone="gold">{review.laporanTerbuka} laporan pengunjung</Badge>}</div><div className="mt-3 flex flex-wrap gap-1.5"><Badge><WeatherIcon weather={review.weather} /> {review.weather}</Badge><Badge tone="cream"><WaterIcon /> {review.water}</Badge>{review.waterBody && <Badge tone="cream"><WaterBodyIcon /> {review.waterBody}</Badge>}<Badge tone="cream"><FishingTypeIcon /> {review.fishingType}</Badge>{catchBadges(review).map((badge) => <Badge key={badge.label} tone="cream"><CatchIcon icon={badge.icon} /> {badge.label}</Badge>)}</div><p className="mt-3 text-sm leading-6 text-[#626d63] (4.63:1 terburuk)">“{review.comment}”</p>{review.holdReason && <p className="mt-2 rounded-lg bg-[#faf3e3] px-2.5 py-1.5 text-[10px] font-semibold leading-4 text-[#7e6633] (4.70:1 terburuk)">Ditahan otomatis: {review.holdReason.replace(/;\s*/g, ", ")}</p>}{review.status === "pending" && !review.holdReason && <p className="mt-2 text-[10px] font-semibold text-[#969d94]">Ditahan sebelum moderasi otomatis berlaku — perlu tinjauan manual.</p>}<p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#666d63] (4.58:1 terburuk)"><MessageSquareText size={12} /> resep: {review.recipeSlug}</p></div><div className="flex shrink-0 gap-2 md:flex-col">{review.status !== "approved" && <button type="button" disabled={busyId === review.id || !canModerate} onClick={() => void moderate(review, "approved")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#eaf2e7] px-3 text-[10px] font-bold text-[#426744] hover:bg-[#dcebd8] disabled:opacity-50"><ThumbsUp size={13} />Setujui</button>}{review.status !== "rejected" && <button type="button" disabled={busyId === review.id || !canModerate} onClick={() => void moderate(review, "rejected")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#eee5e1] px-3 text-[10px] font-bold text-[#905d4b] (4.68:1 terburuk) hover:bg-[#fbf2ee] disabled:opacity-50"><ThumbsDown size={13} />Tolak</button>}{review.status !== "pending" && <button type="button" disabled={busyId === review.id || !canModerate} onClick={() => void moderate(review, "pending")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e7eae4] px-3 text-[10px] font-bold text-[#636e63] (4.57:1 terburuk) hover:bg-[#f5f7f3] disabled:opacity-50"><ShieldCheck size={13} />Tahan</button>}{review.laporanTerbuka > 0 && <button type="button" disabled={busyId === review.id || !canModerate} onClick={() => void abaikanLaporan(review)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e7eae4] px-3 text-[10px] font-bold text-[#636e63] hover:bg-[#f5f7f3] disabled:opacity-50">Abaikan laporan</button>}</div></div></article>)}</div> : <div className="grid min-h-64 place-items-center px-6 py-12 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f4ee] text-[#606e5e] (4.63:1 terburuk)"><MessageSquareText size={20} /></span><h3 className="mt-4 text-sm font-extrabold text-[#3b4b3d]">{rows.length ? "Tidak ada ulasan pada filter ini" : "Belum ada ulasan kiriman"}</h3><p className="mt-1.5 text-xs leading-5 text-[#656d65] (4.59:1 terburuk)">{rows.length ? "Coba filter status atau kata kunci yang lain." : "Ulasan berisiko rendah langsung tampil publik. Yang ditahan sistem masuk ke antrean ini."}</p><Link href="/katalog" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#4f724f]">Buka katalog <ArrowRightSmall /></Link></div></div>}
        <div className="flex items-center gap-2 border-t border-[#eef0ec] bg-[#fafbf9] px-4 py-3 text-[9px] text-[#959c93] sm:px-5"><ShieldCheck size={12} /> Hanya ulasan berstatus Disetujui yang tampil di resep publik. Ulasan Ditahan hanya terlihat oleh pengirimnya sendiri.</div>
      </section>
    </AdminShell>
  );
}

function ArrowRightSmall() { return <span aria-hidden="true">→</span>; }
