"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Eye, ImageUp, Loader2, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { POPUP_LATAR_RATIO, PromoModal } from "@/components/promo-modal";
import { Badge } from "@/components/shared";
import {
  DEFAULT_POPUP,
  MEDIA_ACCEPT,
  MEDIA_LABELS,
  MEDIA_MAX_BYTES,
  POPUP_ICONS,
  POPUP_ICON_LABELS,
  getPopupVersion,
  mergeAppearance,
  type AppearanceState,
  type MediaKey,
  type PopupIcon,
  type PopupSettings,
} from "@/lib/appearance";
import { PROMO_SEEN_WINDOW_MS, clearPromoSeen } from "@/lib/promo-storage";

const fieldClass = "min-h-11 w-full rounded-xl border border-[#e2e8e1] bg-white px-3.5 text-sm text-[#344638] outline-none transition placeholder:text-[#a1a89f] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const areaClass = "min-h-24 w-full resize-y rounded-xl border border-[#e2e8e1] bg-white px-3.5 py-3 text-sm leading-6 text-[#344638] outline-none transition placeholder:text-[#a1a89f] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const labelClass = "grid gap-1.5 text-xs font-bold text-[#616c60] (4.71:1 terburuk)";
const hintClass = "text-[10px] font-medium leading-4 text-[#959c93]";

const formatBytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/**
 * Pratinjau poster yang menampilkan gambar secara utuh.
 *
 * Poster di situs publik dirender dengan lebar penuh dan tinggi mengikuti rasio
 * aslinya (`h-auto w-full`), jadi pratinjau di sini memakai cara yang sama.
 * Kotak berukuran tetap dengan `object-cover` membuat gambar terlihat terpotong
 * dan tidak mewakili tampilan sebenarnya.
 */
function PosterPreview({ src, intrinsicWidth, intrinsicHeight, frameClass, alt, note }: {
  src: string; intrinsicWidth: number; intrinsicHeight: number; frameClass: string; alt: string; note: string;
}) {
  const [ukuran, setUkuran] = useState<{ width: number; height: number } | null>(null);
  return (
    <>
      <div className="mt-3 rounded-xl border border-[#e8ece5] bg-[#f1f4ef] p-2">
        {/* `unoptimized`: pratinjau dashboard memakai penanda versi `?v=` pada
            URL-nya agar gambar yang baru diunggah langsung terlihat, sedangkan
            pengoptimal Next menolak `src` lokal ber-query string (membalas
            400 "url parameter is not allowed") — tanpa ini pratinjau rusak.
            Berkas dimuat langsung dari `/api/media/...` yang memang ringan. */}
        <Image
          src={src}
          unoptimized
          width={intrinsicWidth}
          height={intrinsicHeight}
          sizes="420px"
          alt={alt}
          // Ukuran asli berkas ditampilkan supaya admin tahu rasio yang dipakai.
          // Pembaruan dibuat idempoten: `onLoad` bisa terpanggil lagi saat
          // komponen dirender ulang, dan menyetel objek baru setiap kali akan
          // memicu render tanpa henti.
          onLoad={(event) => {
            const gambar = event.currentTarget;
            if (gambar.naturalWidth <= 0) return;
            const width = gambar.naturalWidth;
            const height = gambar.naturalHeight;
            setUkuran((sebelum) => (sebelum && sebelum.width === width && sebelum.height === height ? sebelum : { width, height }));
          }}
          className={`block h-auto w-full rounded-lg ${frameClass}`}
        />
      </div>
      <p className="mt-2 text-[10px] font-medium text-[#959c93]">
        Pratinjau utuh tanpa dipotong, sama seperti yang dilihat pengunjung{ukuran ? ` · ${ukuran.width} × ${ukuran.height} px` : ""} · {note}
      </p>
    </>
  );
}
const formatDate = (value: string | null) => (value
  ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  : "—");

export function AppearanceManager() {
  const [state, setState] = useState<AppearanceState | null>(null);
  const [form, setForm] = useState<PopupSettings>(DEFAULT_POPUP);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputs = useRef<Partial<Record<MediaKey, HTMLInputElement | null>>>({});

  /** Menyimpan keadaan tampilan dari server ke state editor. */
  const applyAppearance = useCallback((payload: unknown) => {
    const data = mergeAppearance(payload);
    setState(data);
    const { media: _media, version: _version, ...popup } = data.popup;
    void _media;
    void _version;
    setForm(popup);
  }, []);

  // `loading` sudah bernilai true sejak awal; perubahan state hanya terjadi di
  // dalam callback permintaan jaringan, bukan langsung di badan effect.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/appearance", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json() as AppearanceState & { error?: string } }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) { setError(data.error ?? "Pengaturan tampilan gagal dimuat."); return; }
        applyAppearance(data);
      })
      .catch(() => { if (active) setError("Pengaturan tampilan gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applyAppearance]);

  async function savePopup() {
    setBusy("popup"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json() as { appearance?: AppearanceState; notice?: string; error?: string };
      if (!response.ok || !data.appearance) throw new Error(data.error ?? "Pengaturan popup gagal disimpan.");
      applyAppearance(data.appearance);
      setNotice(data.notice ?? "Pengaturan popup disimpan.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pengaturan popup gagal disimpan.");
    } finally {
      setBusy("");
    }
  }

  async function uploadMedia(key: MediaKey, file: File) {
    setBusy(key); setError(""); setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/admin/appearance/media/${key}`, { method: "POST", body });
      const data = await response.json() as { error?: string; notice?: string; media?: AppearanceState["logo"] };
      if (!response.ok || !data.media) throw new Error(data.error ?? "Gambar gagal diunggah.");
      setState((current) => current ? applyMedia(current, data.media!) : current);
      setNotice(`${MEDIA_LABELS[key]} diperbarui.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gambar gagal diunggah.");
    } finally {
      setBusy("");
      const input = fileInputs.current[key];
      if (input) input.value = "";
    }
  }

  async function resetMedia(key: MediaKey) {
    if (!window.confirm(`Kembalikan ${MEDIA_LABELS[key].toLowerCase()} ke gambar bawaan?`)) return;
    setBusy(key); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/appearance/media/${key}`, { method: "DELETE" });
      const data = await response.json() as { error?: string; media?: AppearanceState["logo"] };
      if (!response.ok || !data.media) throw new Error(data.error ?? "Gagal mengembalikan aset bawaan.");
      setState((current) => current ? applyMedia(current, data.media!) : current);
      setNotice(`${MEDIA_LABELS[key]} kembali ke gambar bawaan.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mengembalikan aset bawaan.");
    } finally {
      setBusy("");
    }
  }

  function showAgain() {
    try {
      clearPromoSeen();
      setNotice("Penanda kunjungan dihapus. Buka halaman publik di tab ini untuk melihat popupnya lagi.");
    } catch {
      setError("Peramban ini menolak akses penyimpanan, jadi penanda kunjungan tidak bisa dihapus otomatis.");
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="grid gap-3">
          {[0, 1].map((item) => <div key={item} className="h-40 animate-pulse rounded-[20px] bg-[#f1f4ef]" />)}
        </div>
      </AdminShell>
    );
  }

  const logo = state?.logo;
  const footerLogo = state?.footerLogo;
  const hero = state?.hero;
  const media = state?.popup.media;
  const previewAppearance: AppearanceState | undefined = state && media
    ? { logo: state.logo, footerLogo: state.footerLogo, hero: state.hero, popup: { ...form, media, version: getPopupVersion({ ...form, media }) } }
    : undefined;

  return (
    <AdminShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#656d64] (4.59:1 terburuk)">
            <Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Tampilan</span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Logo &amp; popup</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#626c62] (4.69:1 terburuk)">Kelola logo situs dan popup sambutan yang dilihat pengunjung baru — sama persis dengan yang tampil di situs publik.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button type="button" onClick={() => setPreviewOpen(true)} disabled={!previewAppearance}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe7dc] bg-white px-3.5 text-[11px] font-bold text-[#506550] transition hover:bg-[#f3f6f0] disabled:opacity-60">
            <Eye size={15} /> Pratinjau popup
          </button>
          <Link href="/" target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29]">
            <ArrowUpRight size={15} /> Lihat situs publik
          </Link>
        </div>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs font-semibold text-[#436444]">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}

      {/* Logo */}
      <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Logo situs</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Dipakai di navbar, footer, halaman masuk, popup sambutan, dan dashboard.</p>
          </div>
          {logo && <Badge tone={logo.custom ? "sage" : "cream"}>{logo.custom ? "Gambar unggahan" : "Gambar bawaan"}</Badge>}
        </header>
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[220px_1fr]">
          <div className="grid content-start gap-3">
            <div className="grid place-items-center rounded-2xl border border-[#e8ece5] bg-[#f7f9f5] p-4">
              <Image src={`${logo?.url ?? "/images/logo-umpan-mas.png"}?v=${logo?.updatedAt ?? "bawaan"}`} unoptimized alt="Pratinjau logo situs" width={104} height={104} className="h-26 w-26 object-contain" />
            </div>
            <p className="text-center text-[10px] leading-4 text-[#929a91]">Diperbarui: {formatDate(logo?.updatedAt ?? null)}</p>
          </div>
          <div className="grid content-start gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#e8ece5] bg-[#fbfcfa] px-4 py-3">
              <Image src={`${logo?.url ?? "/images/logo-umpan-mas.png"}?v=${logo?.updatedAt ?? "bawaan"}`} unoptimized alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
              <span className="text-[15px] font-black tracking-[.07em] text-[#21392a]">UMPAN MAS</span>
              <span className="ml-auto text-[10px] font-semibold text-[#929a91]">Contoh pemakaian di navbar</span>
            </div>
            <p className={hintClass}>Format PNG, JPEG, atau WebP. Maksimal {formatBytes(MEDIA_MAX_BYTES.logo)}. Latar transparan (PNG) paling bagus untuk logo.</p>
            <div className="flex flex-wrap gap-2">
              <input ref={(node) => { fileInputs.current.logo = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia("logo", file); }} />
              <button type="button" disabled={busy === "logo"} onClick={() => fileInputs.current.logo?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                {busy === "logo" ? <Loader2 size={15} className="animate-spin" /> : <ImageUp size={15} />} Unggah logo baru
              </button>
              <button type="button" disabled={busy === "logo" || !logo?.custom} onClick={() => void resetMedia("logo")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                <RotateCcw size={14} /> Kembalikan bawaan
              </button>
            </div>
            <p className={hintClass}>Favicon/ikon aplikasi masih aset tetap di repo (<code>src/app/icon.png</code>), jadi mengikuti logo hanya setelah deploy ulang.</p>
          </div>
        </div>
      </section>

      {/* Logo footer — berkas terpisah dari logo navbar. */}
      <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Logo footer</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Hanya dipakai di footer. Navbar tetap memakai logo situs di atas, jadi keduanya bisa berbeda berkas.</p>
          </div>
          {footerLogo && <Badge tone={footerLogo.custom ? "sage" : "cream"}>{footerLogo.custom ? "Gambar unggahan" : "Gambar bawaan"}</Badge>}
        </header>
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[220px_1fr]">
          <div className="grid content-start gap-3">
            <div className="grid place-items-center gap-2 rounded-2xl bg-[#172d22] p-4">
              <Image
                src={`${footerLogo?.url ?? "/api/media/logo-footer"}?v=${footerLogo?.updatedAt ?? "bawaan"}`}
                unoptimized
                alt="Pratinjau logo footer"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
              <span className="text-lg font-extrabold tracking-tight text-white">UMPAN MAS</span>
            </div>
            <p className="text-center text-[10px] leading-4 text-[#929a91]">Contoh di atas latar hijau footer · diperbarui {formatDate(footerLogo?.updatedAt ?? null)}</p>
          </div>
          <div className="grid content-start gap-3">
            <p className={hintClass}>
              Format PNG, JPEG, atau WebP. Maksimal {formatBytes(MEDIA_MAX_BYTES["logo-footer"])}. Latar transparan (PNG) paling bagus.
              Bawaannya berkas <code>public/images/logo-footer.png</code> — bisa diganti langsung di GitHub, atau diunggah di sini agar berlaku tanpa deploy ulang.
            </p>
            <div className="flex flex-wrap gap-2">
              <input ref={(node) => { fileInputs.current["logo-footer"] = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia("logo-footer", file); }} />
              <button type="button" disabled={busy === "logo-footer"} onClick={() => fileInputs.current["logo-footer"]?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                {busy === "logo-footer" ? <Loader2 size={15} className="animate-spin" /> : <ImageUp size={15} />} Unggah logo footer
              </button>
              <button type="button" disabled={busy === "logo-footer" || !footerLogo?.custom} onClick={() => void resetMedia("logo-footer")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                <RotateCcw size={14} /> Kembalikan bawaan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Gambar hero beranda */}
      <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Gambar hero (beranda)</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Gambar besar di bagian paling atas beranda. Sisi kiri beranda tertutup gradasi hijau dan teks, jadi objek utama sebaiknya berada di sisi kanan.</p>
          </div>
          {hero && <Badge tone={hero.custom ? "sage" : "cream"}>{hero.custom ? "Gambar unggahan" : "Gambar bawaan"}</Badge>}
        </header>
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#666d65] (4.57:1 terburuk)">Pratinjau di beranda</p>
            {/* Memakai gradasi dan pemotongan yang sama seperti bagian hero asli. */}
            <div className="mt-2 overflow-hidden rounded-xl border border-[#e8ece5] bg-[#173326]">
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={`${hero?.url ?? "/api/media/hero"}?v=${hero?.updatedAt ?? "bawaan"}`}
                  unoptimized
                  alt="Pratinjau gambar hero"
                  fill
                  sizes="640px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,37,27,.94)_0%,rgba(19,44,31,.84)_38%,rgba(18,43,31,.48)_67%,rgba(18,43,31,.14)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(12,31,22,.35),transparent_50%)]" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 sm:px-6">
                  <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#e7c277] sm:text-[10px]">Contoh tata letak</p>
                  <p className="mt-1 max-w-[72%] text-sm font-black leading-tight tracking-[-.03em] text-white sm:text-lg">Temukan Umpan Ikan Mas yang <span className="text-[#e9ca87]">Tepat.</span></p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium leading-4 text-[#959c93]">
              Pratinjau memakai rasio dan pemotongan yang sama seperti beranda. Gambar akan memenuhi lebar banner (potong tengah), jadi bagian penting jangan diletakkan di tepi atas/bawah.
            </p>
          </div>
          <div className="grid content-start gap-3">
            <p className={hintClass}>
              Format PNG, JPEG, atau WebP. Maksimal {formatBytes(MEDIA_MAX_BYTES.hero)}. Disarankan gambar lanskap minimal 1280 px.
              Bawaan: <code>public/images/pond-hero.jpg</code> ({formatBytes(163_788)}) — bisa ditimpa langsung di GitHub, atau diunggah di sini agar berlaku tanpa deploy ulang.
            </p>
            <p className={hintClass}>Diperbarui: {formatDate(hero?.updatedAt ?? null)}. Gambar baru tampil di beranda dalam ±2 menit (cache gambar), atau langsung setelah muat ulang paksa.</p>
            <div className="flex flex-wrap gap-2">
              <input ref={(node) => { fileInputs.current.hero = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia("hero", file); }} />
              <button type="button" disabled={busy === "hero"} onClick={() => fileInputs.current.hero?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                {busy === "hero" ? <Loader2 size={15} className="animate-spin" /> : <ImageUp size={15} />} Unggah gambar hero
              </button>
              <button type="button" disabled={busy === "hero" || !hero?.custom} onClick={() => void resetMedia("hero")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                <RotateCcw size={14} /> Kembalikan bawaan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Popup */}
      <section className="overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Popup sambutan</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Muncul pada kunjungan pertama, setiap sesi peramban baru (tab ditutup lalu dibuka lagi), setelah lewat {PROMO_SEEN_WINDOW_MS / 3_600_000} jam, dan satu kali setiap isi/gambar popup diganti. Tanpa scroll, dan aksinya hanya menutup.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={showAgain} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#e2e7e0] bg-white px-3 text-[10px] font-bold text-[#5c6b5c] transition hover:bg-[#f4f7f2]">
              <Sparkles size={13} /> Tampilkan lagi untuk saya
            </button>
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full bg-[#f3f6f0] px-3 text-[11px] font-bold text-[#456047]">
              <input type="checkbox" className="h-4 w-4 accent-[#345d3a]" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
              {form.enabled ? "Aktif" : "Nonaktif"}
            </label>
          </div>
        </header>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
          <div className="grid content-start gap-4">
            <div className={labelClass}>
              <span>Mode tampilan</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {([["poster", "Poster gambar", "Pakai gambar poster (informasi sudah menyatu di gambar)."], ["teks", "Gambar + teks", "Unggah gambar latar, teks diisi di sini sehingga mudah diperbarui."]] as const).map(([value, title, description]) => (
                  <label key={value} className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 text-left transition ${form.mode === value ? "border-[#8fae87] bg-[#f2f7f0]" : "border-[#e6eae3] bg-white hover:bg-[#fafbf8]"}`}>
                    <input type="radio" name="popup-mode" className="mt-0.5 h-4 w-4 accent-[#345d3a]" checked={form.mode === value} onChange={() => setForm({ ...form, mode: value })} />
                    <span>
                      <span className="block text-xs font-extrabold text-[#354639]">{title}</span>
                      <span className={`mt-1 block ${hintClass}`}>{description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {form.mode === "poster" ? (
              <div className="grid gap-4">
                {(["popup-mobile", "popup-desktop"] as const).map((key) => {
                  const info = key === "popup-mobile" ? media?.mobile : media?.desktop;
                  return (
                    <div key={key} className="rounded-2xl border border-[#e8ece5] bg-[#fbfcfa] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-extrabold text-[#354639]">{MEDIA_LABELS[key]}</p>
                        <Badge tone={info?.custom ? "sage" : "cream"}>{info?.custom ? "Unggahan" : "Bawaan"}</Badge>
                      </div>
                      <PosterPreview
                        src={`${info?.url ?? ""}?v=${info?.updatedAt ?? "bawaan"}`}
                        intrinsicWidth={key === "popup-mobile" ? 860 : 1640}
                        intrinsicHeight={key === "popup-mobile" ? 1216 : 1040}
                        frameClass={key === "popup-mobile" ? "mx-auto max-w-[190px]" : ""}
                        alt={`Pratinjau ${MEDIA_LABELS[key].toLowerCase()}`}
                        note={`bawaan ${formatBytes(key === "popup-mobile" ? 90_655 : 125_652)} · diperbarui ${formatDate(info?.updatedAt ?? null)}`}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input ref={(node) => { fileInputs.current[key] = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                          onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia(key, file); }} />
                        <button type="button" disabled={busy === key} onClick={() => fileInputs.current[key]?.click()} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#294b34] px-3 text-[11px] font-bold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                          {busy === key ? <Loader2 size={13} className="animate-spin" /> : <ImageUp size={13} />} Ganti gambar
                        </button>
                        <button type="button" disabled={busy === key || !info?.custom} onClick={() => void resetMedia(key)} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-3 text-[11px] font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[#e8ece5] bg-[#fbfcfa] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-[#354639]">{MEDIA_LABELS["popup-latar"]}</p>
                    <Badge tone={media?.latar.custom ? "sage" : "cream"}>{media?.latar.custom ? "Unggahan" : "Bawaan"}</Badge>
                  </div>
                  <div className="mt-3 rounded-xl border border-[#e8ece5] bg-[#f1f4ef] p-2">
                    <div className="relative mx-auto w-full max-w-[190px] overflow-hidden rounded-lg" style={{ aspectRatio: POPUP_LATAR_RATIO }}>
                      <Image src={`${media?.latar.url ?? ""}?v=${media?.latar.updatedAt ?? "bawaan"}`} unoptimized alt="Pratinjau latar popup mode teks" fill sizes="190px" className="object-cover object-center" />
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] font-medium text-[#959c93]">Dipotong mengikuti bingkai popup (43:64) karena dipakai sebagai latar — persis seperti tampilan pengunjung. Pilih gambar yang gelap atau berkontras rendah di area teks, karena teks popup berwarna putih.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input ref={(node) => { fileInputs.current["popup-latar"] = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                      onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia("popup-latar", file); }} />
                    <button type="button" disabled={busy === "popup-latar"} onClick={() => fileInputs.current["popup-latar"]?.click()} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#294b34] px-3 text-[11px] font-bold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                      {busy === "popup-latar" ? <Loader2 size={13} className="animate-spin" /> : <ImageUp size={13} />} Ganti gambar
                    </button>
                    <button type="button" disabled={busy === "popup-latar" || !media?.latar.custom} onClick={() => void resetMedia("popup-latar")} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-3 text-[11px] font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>

                <label className={labelClass}>
                  <span>Judul sambutan</span>
                  <input className={fieldClass} value={form.judul} maxLength={70} onChange={(event) => setForm({ ...form, judul: event.target.value })} />
                  <span className={hintClass}>{form.judul.length}/70 karakter</span>
                </label>

                <label className={labelClass}>
                  <span>Ringkasan</span>
                  <textarea className={areaClass} value={form.ringkasan} maxLength={200} onChange={(event) => setForm({ ...form, ringkasan: event.target.value })} />
                  <span className={hintClass}>{form.ringkasan.length}/200 karakter</span>
                </label>

                <div className="grid gap-3">
                  <p className="text-xs font-bold text-[#616c60] (4.71:1 terburuk)">Kotak statistik <span className={hintClass}>({form.statistik.length} dari maksimal 3)</span></p>
                  {form.statistik.map((stat, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[110px_1fr_auto]">
                      <input className={fieldClass} value={stat.value} maxLength={8} placeholder="200" aria-label={`Angka statistik ${index + 1}`}
                        onChange={(event) => setForm({ ...form, statistik: form.statistik.map((item, i) => i === index ? { ...item, value: event.target.value } : item) })} />
                      <input className={fieldClass} value={stat.label} maxLength={22} placeholder="racikan umpan" aria-label={`Keterangan statistik ${index + 1}`}
                        onChange={(event) => setForm({ ...form, statistik: form.statistik.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} />
                      <button type="button" aria-label={`Hapus statistik ${index + 1}`} disabled={form.statistik.length <= 2}
                        onClick={() => setForm({ ...form, statistik: form.statistik.filter((_, i) => i !== index) })}
                        className="grid h-11 w-11 place-items-center rounded-xl border border-[#e6eae3] text-[#905f50] (4.57:1 terburuk) transition hover:bg-[#fbefec] disabled:opacity-40">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button type="button" disabled={form.statistik.length >= 3} onClick={() => setForm({ ...form, statistik: [...form.statistik, { value: "", label: "" }] })}
                    className="min-h-10 w-fit rounded-xl border border-dashed border-[#cfdac9] px-3 text-[11px] font-bold text-[#4f6b50] transition hover:bg-[#f4f7f2] disabled:opacity-50">
                    + Tambah statistik
                  </button>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-bold text-[#616c60] (4.71:1 terburuk)">Sorotan fitur <span className={hintClass}>({form.fitur.length} dari 2–4)</span></p>
                  {form.fitur.map((feature, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                      <select className={fieldClass} value={feature.icon} aria-label={`Ikon fitur ${index + 1}`}
                        onChange={(event) => setForm({ ...form, fitur: form.fitur.map((item, i) => i === index ? { ...item, icon: event.target.value as PopupIcon } : item) })}>
                        {POPUP_ICONS.map((icon) => <option key={icon} value={icon}>{POPUP_ICON_LABELS[icon]}</option>)}
                      </select>
                      <input className={fieldClass} value={feature.text} maxLength={90} placeholder="Cari racikan dari cuaca, kondisi air, dan budget." aria-label={`Teks fitur ${index + 1}`}
                        onChange={(event) => setForm({ ...form, fitur: form.fitur.map((item, i) => i === index ? { ...item, text: event.target.value } : item) })} />
                      <button type="button" aria-label={`Hapus fitur ${index + 1}`} disabled={form.fitur.length <= 2}
                        onClick={() => setForm({ ...form, fitur: form.fitur.filter((_, i) => i !== index) })}
                        className="grid h-11 w-11 place-items-center rounded-xl border border-[#e6eae3] text-[#905f50] (4.57:1 terburuk) transition hover:bg-[#fbefec] disabled:opacity-40">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button type="button" disabled={form.fitur.length >= 4} onClick={() => setForm({ ...form, fitur: [...form.fitur, { icon: "target", text: "" }] })}
                    className="min-h-10 w-fit rounded-xl border border-dashed border-[#cfdac9] px-3 text-[11px] font-bold text-[#4f6b50] transition hover:bg-[#f4f7f2] disabled:opacity-50">
                    + Tambah fitur
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="grid content-start gap-4">
            <div className="rounded-2xl border border-[#e8ece5] bg-[#f7f9f5] p-4">
              <p className="text-xs font-extrabold text-[#354639]">Yang dilihat pengunjung</p>
              <ul className="mt-3 grid gap-2 text-[11px] leading-5 text-[#606d62] (4.67:1 terburuk)">
                <li>• Muncul pada kunjungan pertama, setiap sesi peramban baru, lagi setelah lewat {PROMO_SEEN_WINDOW_MS / 3_600_000} jam, dan satu kali setiap kali popup diganti — setelah halaman tenang (± 1,4 detik). Pengunjung tidak perlu menghapus cache.</li>
                <li>• Selama masa itu, pengunjung yang berpindah halaman tidak melihatnya berulang kali.</li>
                <li>• Tidak muncul di <code>/dashboard</code> dan <code>/login</code>.</li>
                <li>• Tanpa scroll. Aksinya hanya tombol tutup, klik di luar kartu, atau <code>Esc</code>.</li>
                <li>• Teks nilai pada mode teks dibatasi panjangnya agar selalu muat.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPreviewOpen(true)} disabled={!previewAppearance}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dfe7dc] bg-white px-4 text-xs font-bold text-[#506550] transition hover:bg-[#f3f6f0] disabled:opacity-50">
                <Eye size={15} /> Pratinjau versi sekarang
              </button>
              <button type="button" onClick={() => void savePopup()} disabled={busy === "popup"}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-5 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                {busy === "popup" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan pengaturan popup
              </button>
            </div>
            <p className={hintClass}>Pratinjau memakai pengaturan yang sedang Anda isi, termasuk perubahan yang belum disimpan.</p>
          </div>
        </div>
      </section>

      {previewOpen && previewAppearance && (
        <PromoModal override={previewAppearance} preview onClose={() => setPreviewOpen(false)} />
      )}
    </AdminShell>
  );
}

/** Menukar satu berkas media pada keadaan tampilan tanpa memuat ulang seluruhnya. */
function applyMedia(state: AppearanceState, media: AppearanceState["logo"]): AppearanceState {
  if (media.key === "logo") return { ...state, logo: media };
  if (media.key === "logo-footer") return { ...state, footerLogo: media };
  if (media.key === "hero") return { ...state, hero: media };
  const popup = {
    ...state.popup,
    media: {
      mobile: media.key === "popup-mobile" ? media : state.popup.media.mobile,
      desktop: media.key === "popup-desktop" ? media : state.popup.media.desktop,
      latar: media.key === "popup-latar" ? media : state.popup.media.latar,
    },
  };
  return { ...state, popup: { ...popup, version: getPopupVersion(popup) } };
}
