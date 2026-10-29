"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Eye, ImageUp, Loader2, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminCan, useAdminMe } from "@/components/admin/use-admin-me";
import { POPUP_LATAR_RATIO, PromoModal } from "@/components/promo-modal";
import { Badge } from "@/components/shared";
import {
  DEFAULT_POPUP,
  MEDIA_ACCEPT,
  MEDIA_DEFAULTS,
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
import { formatUkuranBerkas, kompresGambar, type OpsiKompresi } from "@/lib/image-compress";
import { PROMO_SEEN_WINDOW_MS, clearPromoSeen } from "@/lib/promo-storage";

const fieldClass = "min-h-11 w-full rounded-xl border border-[#e2e8e1] bg-white px-3.5 text-sm text-[#344638] outline-none transition placeholder:text-[#a1a89f] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const areaClass = "min-h-24 w-full resize-y rounded-xl border border-[#e2e8e1] bg-white px-3.5 py-3 text-sm leading-6 text-[#344638] outline-none transition placeholder:text-[#a1a89f] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const labelClass = "grid gap-1.5 text-xs font-bold text-[#616c60] (4.71:1 terburuk)";
const hintClass = "text-[10px] font-medium leading-4 text-[#959c93]";

const formatBytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/**
 * Perubahan gambar yang masih ditahan di halaman ini dan baru dikirim ke
 * server saat tombol "Simpan perubahan" ditekan — sama seperti isian teks
 * popup. `berkas` = admin memilih gambar baru (pratinjau lokal dari berkas
 * hasil kompresi), `bawaan` = admin meminta kembali ke gambar bawaan.
 */
type PerubahanMedia =
  | { jenis: "berkas"; file: File; pratinjau: string; ukuranAsli: number }
  | { jenis: "bawaan" };

type InfoMedia = AppearanceState["logo"];

/** Target kompresi per slot: resolusi tidak lebih kecil dari ukuran tampilnya. */
const OPSI_KOMPRESI_MEDIA: Record<MediaKey, OpsiKompresi> = {
  logo: { lebarMaks: 512, targetBytes: 100_000 },
  "logo-footer": { lebarMaks: 512, targetBytes: 100_000 },
  hero: { lebarMaks: 1920, targetBytes: 200_000 },
  "popup-mobile": { lebarMaks: 1080, targetBytes: 200_000 },
  "popup-desktop": { lebarMaks: 1080, targetBytes: 200_000 },
  "popup-latar": { lebarMaks: 1080, targetBytes: 200_000 },
};

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
  const me = useAdminMe();
  // Peran tanpa kapabilitas tampilan (mis. Hanya-lihat): seluruh formulir
  // nonaktif lewat fieldset di bawah. Server tetap penegak utama.
  const readOnly = !adminCan(me, "tampilan");
  const [state, setState] = useState<AppearanceState | null>(null);
  const [form, setForm] = useState<PopupSettings>(DEFAULT_POPUP);
  // Potret pengaturan popup yang terakhir tersimpan di server, pembanding
  // untuk tahu apakah isian teks berubah dan untuk tombol Batalkan.
  const [formTersimpan, setFormTersimpan] = useState<PopupSettings>(DEFAULT_POPUP);
  const [tertunda, setTertunda] = useState<Partial<Record<MediaKey, PerubahanMedia>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputs = useRef<Partial<Record<MediaKey, HTMLInputElement | null>>>({});
  const tertundaRef = useRef(tertunda);

  useEffect(() => { tertundaRef.current = tertunda; }, [tertunda]);
  // Lepas semua URL pratinjau lokal saat halaman ditinggalkan.
  useEffect(() => () => {
    Object.values(tertundaRef.current).forEach((item) => {
      if (item?.jenis === "berkas") URL.revokeObjectURL(item.pratinjau);
    });
  }, []);

  /** Menyimpan keadaan tampilan dari server ke state editor. */
  const applyAppearance = useCallback((payload: unknown) => {
    const data = mergeAppearance(payload);
    setState(data);
    const { media: _media, version: _version, ...popup } = data.popup;
    void _media;
    void _version;
    setForm(popup);
    setFormTersimpan(popup);
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

  /** Menyetel/menghapus satu perubahan gambar tertunda, melepas pratinjau lokal yang tergantikan. */
  function gantiTertunda(key: MediaKey, item: PerubahanMedia | undefined) {
    setTertunda((prev) => {
      const lama = prev[key];
      if (lama?.jenis === "berkas") URL.revokeObjectURL(lama.pratinjau);
      const next = { ...prev };
      if (item) next[key] = item; else delete next[key];
      return next;
    });
  }

  /**
   * Memilih gambar baru: kompres dulu di peramban, lalu tahan sebagai
   * pratinjau lokal. Belum ada yang dikirim ke server — gambar baru tayang
   * setelah "Simpan perubahan" ditekan, dan membatalkannya tidak menyisakan
   * berkas yatim di basis data.
   */
  async function pilihBerkas(key: MediaKey, file: File) {
    setBusy(key); setError(""); setNotice("");
    try {
      const hasil = await kompresGambar(file, OPSI_KOMPRESI_MEDIA[key]);
      gantiTertunda(key, { jenis: "berkas", file: hasil.file, pratinjau: URL.createObjectURL(hasil.file), ukuranAsli: hasil.ukuranAsli });
    } catch {
      setError(`Gambar untuk ${MEDIA_LABELS[key].toLowerCase()} gagal diproses. Coba berkas lain.`);
    } finally {
      setBusy("");
      const input = fileInputs.current[key];
      if (input) input.value = "";
    }
  }

  /** Menahan permintaan kembali ke gambar bawaan sampai disimpan; masih bisa diurungkan sebelum itu. */
  function tundaBawaan(key: MediaKey) {
    setError(""); setNotice("");
    gantiTertunda(key, { jenis: "bawaan" });
  }

  /** Mengirim satu perubahan gambar tertunda ke server dan menerapkan hasilnya ke state. */
  async function kirimPerubahanMedia(key: MediaKey, item: PerubahanMedia) {
    if (item.jenis === "berkas") {
      const body = new FormData();
      body.append("file", item.file);
      const response = await fetch(`/api/admin/appearance/media/${key}`, { method: "POST", body });
      const data = await response.json() as { error?: string; media?: InfoMedia };
      if (!response.ok || !data.media) throw new Error(data.error ?? "Gambar gagal diunggah.");
      setState((current) => (current ? applyMedia(current, data.media!) : current));
      return;
    }
    const response = await fetch(`/api/admin/appearance/media/${key}`, { method: "DELETE" });
    const data = await response.json() as { error?: string; media?: InfoMedia };
    if (!response.ok || !data.media) throw new Error(data.error ?? "Gagal mengembalikan aset bawaan.");
    setState((current) => (current ? applyMedia(current, data.media!) : current));
  }

  /**
   * Satu-satunya jalan menyimpan halaman ini: kirim gambar yang tertunda satu
   * per satu, lalu pengaturan popup bila berubah. Bila satu gambar gagal,
   * penyimpanan berhenti dan sisanya tetap tertahan di halaman untuk dicoba
   * lagi — tidak ada editan yang hilang.
   */
  async function simpanSemua() {
    if (menyimpan) return;
    setMenyimpan(true); setError(""); setNotice("");
    const tersimpan: string[] = [];
    for (const [key, item] of Object.entries(tertunda) as [MediaKey, PerubahanMedia][]) {
      try {
        await kirimPerubahanMedia(key, item);
        tersimpan.push(MEDIA_LABELS[key]);
        gantiTertunda(key, undefined);
      } catch (caught) {
        const pesan = caught instanceof Error ? caught.message : "Gambar gagal disimpan.";
        setError(`${MEDIA_LABELS[key]} gagal disimpan, jadi penyimpanan dihentikan (${pesan}).${tersimpan.length ? ` ${tersimpan.join(", ")} sudah tersimpan.` : ""} Perubahan lain masih tertahan di halaman ini — periksa lalu tekan "Simpan perubahan" lagi.`);
        setMenyimpan(false);
        return;
      }
    }
    if (JSON.stringify(form) !== JSON.stringify(formTersimpan)) {
      try {
        const response = await fetch("/api/admin/appearance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json() as { appearance?: AppearanceState; error?: string };
        if (!response.ok || !data.appearance) throw new Error(data.error ?? "Pengaturan popup gagal disimpan.");
        applyAppearance(data.appearance);
      } catch (caught) {
        const pesan = caught instanceof Error ? caught.message : "Pengaturan popup gagal disimpan.";
        setError(`Gambar sudah tersimpan, tetapi pengaturan popup gagal disimpan (${pesan}). Tekan "Simpan perubahan" lagi untuk mencobanya.`);
        setMenyimpan(false);
        return;
      }
    }
    setNotice("Perubahan tersimpan dan sudah tayang di situs publik.");
    setMenyimpan(false);
  }

  /** Membuang semua perubahan yang belum disimpan dan kembali ke keadaan terakhir dari server. */
  function batalkanSemua() {
    (Object.values(tertunda) as PerubahanMedia[]).forEach((item) => {
      if (item.jenis === "berkas") URL.revokeObjectURL(item.pratinjau);
    });
    setTertunda({});
    setForm(formTersimpan);
    setError("");
    setNotice("Perubahan yang belum disimpan dibatalkan.");
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

  /**
   * Versi info media untuk pratinjau popup publik. Popup asli dirender lewat
   * pengoptimal gambar Next yang tidak menerima URL blob lokal, jadi gambar
   * yang baru dipilih tetap memakai gambar tersimpan di pratinjau ini —
   * gambar barunya terlihat di pratinjau panelnya masing-masing. Penahanan
   * "kembali ke bawaan" bisa ditampilkan persis karena berkas bawaannya ada
   * sebagai berkas publik di repo.
   */
  function infoPratinjauPopup(key: MediaKey, info: InfoMedia): InfoMedia {
    if (tertunda[key]?.jenis === "bawaan") return { ...info, url: MEDIA_DEFAULTS[key], custom: false, updatedAt: null };
    return info;
  }

  /** Alamat gambar untuk pratinjau panel, termasuk gambar yang masih tertunda. */
  function sumberTampil(key: MediaKey, info: InfoMedia | undefined): string {
    const item = tertunda[key];
    if (item?.jenis === "berkas") return item.pratinjau;
    if (item?.jenis === "bawaan") return MEDIA_DEFAULTS[key];
    return `${info?.url ?? MEDIA_DEFAULTS[key]}?v=${info?.updatedAt ?? "bawaan"}`;
  }

  function badgeMedia(key: MediaKey, info: InfoMedia | undefined) {
    if (tertunda[key]) return <Badge tone="gold">Belum disimpan</Badge>;
    if (!info) return null;
    return <Badge tone={info.custom ? "sage" : "cream"}>{info.custom ? "Gambar unggahan" : "Gambar bawaan"}</Badge>;
  }

  /** Catatan + tombol urungkan untuk satu slot gambar yang perubahannya masih tertunda. */
  function catatanTertunda(key: MediaKey) {
    const item = tertunda[key];
    if (!item) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e9e2c8] bg-[#fbf7e8] px-3 py-2.5">
        <p className="min-w-0 flex-1 text-[11px] font-semibold leading-4 text-[#7a6535]">
          {item.jenis === "berkas"
            ? <>Gambar baru belum disimpan — {item.file.name} ({formatUkuranBerkas(item.file.size)}{item.ukuranAsli !== item.file.size ? ` dari ${formatUkuranBerkas(item.ukuranAsli)}` : ""}). Tayang setelah Anda menekan &quot;Simpan perubahan&quot;.</>
            : <>Akan dikembalikan ke gambar bawaan setelah Anda menekan &quot;Simpan perubahan&quot;.</>}
        </p>
        <button type="button" disabled={menyimpan} onClick={() => gantiTertunda(key, undefined)} className="inline-flex min-h-8 items-center rounded-lg border border-[#ddd3ae] bg-white px-2.5 text-[11px] font-bold text-[#7a6535] transition hover:bg-[#fbf7e8] disabled:opacity-50">
          Urungkan
        </button>
      </div>
    );
  }

  const popupKotor = JSON.stringify(form) !== JSON.stringify(formTersimpan);
  const jumlahTertunda = Object.keys(tertunda).length;
  const adaPerubahan = popupKotor || jumlahTertunda > 0;
  const ringkasanPerubahan = [
    ...(popupKotor ? ["pengaturan popup"] : []),
    ...(Object.keys(tertunda) as MediaKey[]).map((key) => MEDIA_LABELS[key].toLowerCase()),
  ].join(", ");

  const mediaPratinjau = media ? {
    mobile: infoPratinjauPopup("popup-mobile", media.mobile),
    desktop: infoPratinjauPopup("popup-desktop", media.desktop),
    latar: infoPratinjauPopup("popup-latar", media.latar),
  } : undefined;
  const previewAppearance: AppearanceState | undefined = state && mediaPratinjau
    ? { logo: state.logo, footerLogo: state.footerLogo, hero: state.hero, popup: { ...form, media: mediaPratinjau, version: getPopupVersion({ ...form, media: mediaPratinjau }) } }
    : undefined;

  return (
    <AdminShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#656d64] (4.59:1 terburuk)">
            <Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Tampilan</span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Logo &amp; popup</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#626c62] (4.69:1 terburuk)">Atur logo situs dan popup sambutan pengunjung baru, persis seperti yang tampil di situs publik.</p>
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
      {readOnly && me && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-[#e9e4cf] bg-[#fbf7e8] px-4 py-3 text-xs leading-5 text-[#7a6535]"><Eye size={15} className="mt-0.5 shrink-0" /><span><strong>Mode hanya-lihat.</strong> Peran Anda ({me.roleLabel}) dapat melihat pengaturan tampilan ini, tetapi tidak dapat mengubahnya — semua isian dan tombol simpan dinonaktifkan.</span></p>
      )}

      <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
      <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Logo situs</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Dipakai di navbar, footer, halaman masuk, popup sambutan, dan dashboard.</p>
          </div>
          {badgeMedia("logo", logo)}
        </header>
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[220px_1fr]">
          <div className="grid content-start gap-3">
            <div className="grid place-items-center rounded-2xl border border-[#e8ece5] bg-[#f7f9f5] p-4">
              <Image src={sumberTampil("logo", logo)} unoptimized alt="Pratinjau logo situs" width={104} height={104} className="h-26 w-26 object-contain" />
            </div>
            <p className="text-center text-[10px] leading-4 text-[#929a91]">{tertunda.logo ? "Ada gambar baru yang belum disimpan." : `Diperbarui: ${formatDate(logo?.updatedAt ?? null)}`}</p>
          </div>
          <div className="grid content-start gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#e8ece5] bg-[#fbfcfa] px-4 py-3">
              <Image src={sumberTampil("logo", logo)} unoptimized alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
              <span className="text-[15px] font-black tracking-[.07em] text-[#21392a]">UMPAN MAS</span>
              <span className="ml-auto text-[10px] font-semibold text-[#929a91]">Contoh pemakaian di navbar</span>
            </div>
            <p className={hintClass}>Format PNG, JPEG, atau WebP. Maksimal {formatBytes(MEDIA_MAX_BYTES.logo)}. Gambar besar otomatis dikecilkan dan dikompres (target sekitar 100 KB) dengan kualitas dijaga. Latar transparan (PNG) paling bagus untuk logo.</p>
            <div className="flex flex-wrap gap-2">
              <input ref={(node) => { fileInputs.current.logo = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void pilihBerkas("logo", file); }} />
              <button type="button" disabled={busy === "logo" || menyimpan} onClick={() => fileInputs.current.logo?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                {busy === "logo" ? <Loader2 size={15} className="animate-spin" /> : <ImageUp size={15} />} Pilih logo baru
              </button>
              <button type="button" disabled={busy === "logo" || menyimpan || (!logo?.custom && !tertunda.logo)} onClick={() => tundaBawaan("logo")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                <RotateCcw size={14} /> Kembalikan bawaan
              </button>
            </div>
            {catatanTertunda("logo")}
            <p className={hintClass}>Favicon masih berkas tetap di repo (<code>src/app/icon.png</code>), jadi baru mengikuti logo setelah deploy ulang.</p>
          </div>
        </div>
      </section>

      {/* Logo footer — berkas terpisah dari logo navbar. */}
      <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Logo footer</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Khusus footer. Navbar tetap memakai logo situs di atas, jadi keduanya boleh berbeda berkas.</p>
          </div>
          {badgeMedia("logo-footer", footerLogo)}
        </header>
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[220px_1fr]">
          <div className="grid content-start gap-3">
            <div className="grid place-items-center gap-2 rounded-2xl bg-[#172d22] p-4">
              <Image
                src={sumberTampil("logo-footer", footerLogo)}
                unoptimized
                alt="Pratinjau logo footer"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
              <span className="text-lg font-extrabold tracking-tight text-white">UMPAN MAS</span>
            </div>
            <p className="text-center text-[10px] leading-4 text-[#929a91]">{tertunda["logo-footer"] ? "Ada gambar baru yang belum disimpan." : `Contoh di atas latar hijau footer · diperbarui ${formatDate(footerLogo?.updatedAt ?? null)}`}</p>
          </div>
          <div className="grid content-start gap-3">
            <p className={hintClass}>
              Format PNG, JPEG, atau WebP. Maksimal {formatBytes(MEDIA_MAX_BYTES["logo-footer"])}. Gambar besar otomatis dikecilkan dan dikompres (target sekitar 100 KB) dengan kualitas dijaga. Latar transparan (PNG) paling bagus.
              Bawaannya berkas <code>public/images/logo-footer.png</code> — bisa diganti langsung di GitHub, atau dipilih di sini agar berlaku tanpa deploy ulang.
            </p>
            <div className="flex flex-wrap gap-2">
              <input ref={(node) => { fileInputs.current["logo-footer"] = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void pilihBerkas("logo-footer", file); }} />
              <button type="button" disabled={busy === "logo-footer" || menyimpan} onClick={() => fileInputs.current["logo-footer"]?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                {busy === "logo-footer" ? <Loader2 size={15} className="animate-spin" /> : <ImageUp size={15} />} Pilih logo footer
              </button>
              <button type="button" disabled={busy === "logo-footer" || menyimpan || (!footerLogo?.custom && !tertunda["logo-footer"])} onClick={() => tundaBawaan("logo-footer")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                <RotateCcw size={14} /> Kembalikan bawaan
              </button>
            </div>
            {catatanTertunda("logo-footer")}
          </div>
        </div>
      </section>

      {/* Gambar hero beranda */}
      <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Gambar hero (beranda)</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Gambar besar di atas beranda. Sisi kiri tertutup gradasi hijau dan teks, jadi letakkan objek utama di sisi kanan.</p>
          </div>
          {badgeMedia("hero", hero)}
        </header>
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#666d65] (4.57:1 terburuk)">Pratinjau di beranda</p>
            {/* Memakai gradasi dan pemotongan yang sama seperti bagian hero asli. */}
            <div className="mt-2 overflow-hidden rounded-xl border border-[#e8ece5] bg-[#173326]">
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={sumberTampil("hero", hero)}
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
              Pratinjau memakai rasio dan potongan yang sama seperti beranda. Gambar memenuhi lebar banner (dipotong di tengah), jadi jangan letakkan bagian penting di tepi atas/bawah.
            </p>
          </div>
          <div className="grid content-start gap-3">
            <p className={hintClass}>
              Format PNG, JPEG, atau WebP. Maksimal {formatBytes(MEDIA_MAX_BYTES.hero)}. Gambar besar otomatis dikecilkan (lebar maks 1920 px) dan dikompres dengan target sekitar 200 KB agar beranda tetap ringan, dengan kualitas dijaga supaya tidak pecah. Disarankan gambar lanskap minimal 1280 px.
            </p>
            <p className={hintClass}>{tertunda.hero ? "Ada gambar baru yang belum disimpan." : `Diperbarui: ${formatDate(hero?.updatedAt ?? null)}. Gambar baru langsung tampil di beranda setelah tersimpan.`}</p>
            <div className="flex flex-wrap gap-2">
              <input ref={(node) => { fileInputs.current.hero = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void pilihBerkas("hero", file); }} />
              <button type="button" disabled={busy === "hero" || menyimpan} onClick={() => fileInputs.current.hero?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                {busy === "hero" ? <Loader2 size={15} className="animate-spin" /> : <ImageUp size={15} />} Pilih gambar hero
              </button>
              <button type="button" disabled={busy === "hero" || menyimpan || (!hero?.custom && !tertunda.hero)} onClick={() => tundaBawaan("hero")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                <RotateCcw size={14} /> Kembalikan bawaan
              </button>
            </div>
            {catatanTertunda("hero")}
          </div>
        </div>
      </section>

      {/* Popup */}
      <section className="overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Popup sambutan</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Muncul saat kunjungan pertama, tiap sesi browser baru, setelah lewat {PROMO_SEEN_WINDOW_MS / 3_600_000} jam, dan sekali tiap isi/gambar popup diganti. Tanpa scroll, hanya bisa ditutup.</p>
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
                        {badgeMedia(key, info)}
                      </div>
                      <PosterPreview
                        src={sumberTampil(key, info)}
                        intrinsicWidth={key === "popup-mobile" ? 860 : 1640}
                        intrinsicHeight={key === "popup-mobile" ? 1216 : 1040}
                        frameClass={key === "popup-mobile" ? "mx-auto max-w-[190px]" : ""}
                        alt={`Pratinjau ${MEDIA_LABELS[key].toLowerCase()}`}
                        note={tertunda[key] ? "gambar baru belum disimpan" : `bawaan ${formatBytes(key === "popup-mobile" ? 90_655 : 125_652)} · diperbarui ${formatDate(info?.updatedAt ?? null)}`}
                      />
                      <p className={`mt-2 ${hintClass}`}>Gambar besar otomatis dikecilkan (lebar maks 1080 px) dan dikompres dengan target sekitar 200 KB, kualitas dijaga.</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input ref={(node) => { fileInputs.current[key] = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                          onChange={(event) => { const file = event.target.files?.[0]; if (file) void pilihBerkas(key, file); }} />
                        <button type="button" disabled={busy === key || menyimpan} onClick={() => fileInputs.current[key]?.click()} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#294b34] px-3 text-[11px] font-bold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                          {busy === key ? <Loader2 size={13} className="animate-spin" /> : <ImageUp size={13} />} Pilih gambar
                        </button>
                        <button type="button" disabled={busy === key || menyimpan || (!info?.custom && !tertunda[key])} onClick={() => tundaBawaan(key)} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-3 text-[11px] font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>
                      <div className="mt-2">{catatanTertunda(key)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[#e8ece5] bg-[#fbfcfa] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-[#354639]">{MEDIA_LABELS["popup-latar"]}</p>
                    {badgeMedia("popup-latar", media?.latar)}
                  </div>
                  <div className="mt-3 rounded-xl border border-[#e8ece5] bg-[#f1f4ef] p-2">
                    <div className="relative mx-auto w-full max-w-[190px] overflow-hidden rounded-lg" style={{ aspectRatio: POPUP_LATAR_RATIO }}>
                      <Image src={sumberTampil("popup-latar", media?.latar)} unoptimized alt="Pratinjau latar popup mode teks" fill sizes="190px" className="object-cover object-center" />
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] font-medium text-[#959c93]">Dipotong mengikuti bingkai popup (43:64) sebagai latar, persis seperti yang dilihat pengunjung. Pilih gambar gelap atau berkontras rendah di area teks, karena teks popup putih. Gambar besar otomatis dikecilkan (lebar maks 1080 px) dan dikompres dengan target sekitar 200 KB, kualitas dijaga.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input ref={(node) => { fileInputs.current["popup-latar"] = node; }} type="file" accept={MEDIA_ACCEPT} className="sr-only"
                      onChange={(event) => { const file = event.target.files?.[0]; if (file) void pilihBerkas("popup-latar", file); }} />
                    <button type="button" disabled={busy === "popup-latar" || menyimpan} onClick={() => fileInputs.current["popup-latar"]?.click()} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#294b34] px-3 text-[11px] font-bold text-white transition hover:bg-[#203d29] disabled:opacity-60">
                      {busy === "popup-latar" ? <Loader2 size={13} className="animate-spin" /> : <ImageUp size={13} />} Pilih gambar
                    </button>
                    <button type="button" disabled={busy === "popup-latar" || menyimpan || (!media?.latar.custom && !tertunda["popup-latar"])} onClick={() => tundaBawaan("popup-latar")} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-3 text-[11px] font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                  <div className="mt-2">{catatanTertunda("popup-latar")}</div>
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
                <li>• Muncul saat kunjungan pertama, tiap sesi browser baru, lagi setelah lewat {PROMO_SEEN_WINDOW_MS / 3_600_000} jam, dan sekali tiap popup diganti, setelah halaman tenang (± 1,4 detik). Tidak perlu hapus cache.</li>
                <li>• Selama masa itu, popup tidak muncul berulang saat pengunjung berpindah halaman.</li>
                <li>• Tidak muncul di <code>/dashboard</code> dan <code>/login</code>.</li>
                <li>• Tanpa scroll. Aksinya hanya tombol tutup, klik di luar kartu, atau <code>Esc</code>.</li>
                <li>• Teks nilai pada mode teks dibatasi agar selalu muat.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPreviewOpen(true)} disabled={!previewAppearance}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dfe7dc] bg-white px-4 text-xs font-bold text-[#506550] transition hover:bg-[#f3f6f0] disabled:opacity-50">
                <Eye size={15} /> Pratinjau versi sekarang
              </button>
            </div>
            <p className={hintClass}>Pratinjau memakai isian yang sedang Anda buat, termasuk yang belum disimpan. Gambar popup yang baru dipilih terlihat di pratinjau panelnya; semua perubahan baru tayang setelah tombol &quot;Simpan perubahan&quot; di bawah halaman ditekan.</p>
          </div>
        </div>
      </section>

      {adaPerubahan && !readOnly && (
        <div className="sticky bottom-4 z-20 mt-6 flex flex-col gap-3 rounded-2xl border border-[#d8e2d2] bg-white/95 p-4 shadow-[0_16px_40px_rgba(31,46,34,.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-xs leading-5 text-[#5c6a5c]">
            <strong className="text-[#344638]">Ada perubahan belum disimpan</strong> — {ringkasanPerubahan}. Perubahan baru tayang di situs publik setelah disimpan.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={batalkanSemua} disabled={menyimpan}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
              Batalkan
            </button>
            <button type="button" onClick={() => void simpanSemua()} disabled={menyimpan}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-5 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60">
              {menyimpan ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan perubahan
            </button>
          </div>
        </div>
      )}

      </fieldset>

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
