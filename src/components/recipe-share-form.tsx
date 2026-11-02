"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, CheckCircle2, ChevronDown, Circle, Eye, LoaderCircle, Plus, Send, Trash2, X } from "lucide-react";
import { FISHING_TYPES, WATER_CONDITIONS, WEATHER_CONDITIONS } from "@/data/recipes";
import { provinces } from "@/data/provinces";
import type { CmsRecipeRecord } from "@/lib/cms";
import { kompresGambar } from "@/lib/image-compress";
import { UseMyLocationButton } from "@/components/location-controls";
import { useLocationAutofill } from "@/lib/use-location";
import { BIAYA_BAWAAN_RESEP, PILIHAN_BIAYA_CEPAT } from "@/lib/utils";

const inputClass = "min-h-12 w-full rounded-xl border border-[#e4e9e2] bg-white px-3.5 text-sm text-[#334436] outline-none transition placeholder:text-[#969f94] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const labelClass = "mb-1.5 block text-sm font-bold text-[#344638]";
const daftarProvinsi = provinces.map((p) => p.name);

type Bahan = { name: string; brand: string; amount: string; optional: boolean };

type MetaLama = {
  difficulty: string;
  waterBodies: string[];
  seasons: string[];
  suitable: string[];
  notSuitable: string[];
};

const metaAwal: MetaLama = {
  difficulty: "Mudah",
  waterBodies: ["Kolam"],
  seasons: [],
  suitable: [],
  notSuitable: [],
};

function Pilihan({ judul, opsi, dipilih, ubah }: { judul: string; opsi: readonly string[]; dipilih: string[]; ubah: (v: string[]) => void }) {
  const toggle = (nilai: string) => ubah(dipilih.includes(nilai) ? dipilih.filter((i) => i !== nilai) : [...dipilih, nilai]);
  const semuaTerpilih = opsi.length > 0 && opsi.every((item) => dipilih.includes(item));
  const toggleSemua = () => ubah(semuaTerpilih ? [] : [...opsi]);
  return (
    <fieldset>
      <legend className={labelClass}>{judul}</legend>
      <div className="flex flex-wrap gap-2">
        {opsi.length > 1 && (
          <button type="button" onClick={toggleSemua} aria-pressed={semuaTerpilih}
            className={`min-h-10 rounded-full px-3.5 text-[13px] font-bold ring-1 transition ${semuaTerpilih ? "bg-[#294b34] text-white ring-[#294b34]" : "bg-white text-[#7a5f14] ring-dashed ring-[#c9b458] hover:bg-[#fdf6e0]"}`}>
            Semua
          </button>
        )}
        {opsi.map((opsiItem) => {
          const aktif = dipilih.includes(opsiItem);
          return (
            <button key={opsiItem} type="button" onClick={() => toggle(opsiItem)} aria-pressed={aktif}
              className={`min-h-10 rounded-full px-3.5 text-[13px] font-bold transition ${aktif ? "bg-[#294b34] text-white" : "bg-[#f2f5f0] text-[#4b5b4e] ring-1 ring-[#e2e7df] hover:bg-[#e9efe7]"}`}>
              {opsiItem}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ProvinsiDropdown({ dipilih, ubah }: { dipilih: string[]; ubah: (berikut: string[]) => void }) {
  const [terbuka, setTerbuka] = useState(false);
  const [kata, setKata] = useState("");
  const akarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terbuka) return;
    const klikLuar = (event: PointerEvent) => {
      if (akarRef.current && !akarRef.current.contains(event.target as Node)) setTerbuka(false);
    };
    const tombol = (event: KeyboardEvent) => { if (event.key === "Escape") setTerbuka(false); };
    document.addEventListener("pointerdown", klikLuar);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("pointerdown", klikLuar);
      document.removeEventListener("keydown", tombol);
    };
  }, [terbuka]);

  const semuaPilihan = [...daftarProvinsi, ...dipilih.filter((item) => !daftarProvinsi.includes(item))];
  const tampil = kata.trim()
    ? semuaPilihan.filter((item) => item.toLocaleLowerCase("id-ID").includes(kata.trim().toLocaleLowerCase("id-ID")))
    : semuaPilihan;
  const semuaTerpilih = daftarProvinsi.every((item) => dipilih.includes(item));
  const toggle = (item: string) => {
    const set = new Set(dipilih);
    if (set.has(item)) set.delete(item); else set.add(item);
    ubah(semuaPilihan.filter((nama) => set.has(nama)));
  };

  return (
    <div ref={akarRef} className="relative">
      <button type="button" aria-expanded={terbuka} aria-haspopup="true" onClick={() => setTerbuka((cur) => !cur)}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${dipilih.length ? "font-semibold text-[#334436]" : "text-[#636d63]"}`}>
          {dipilih.length ? dipilih.join(", ") : "Pilih provinsi (opsional)…"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {dipilih.length > 0 && <span className="rounded-full bg-[#eef5ea] px-2 py-0.5 text-[11px] font-extrabold text-[#33523a]">{dipilih.length}</span>}
          <ChevronDown size={16} aria-hidden="true" className={`text-[#626d63] transition ${terbuka ? "rotate-180" : ""}`} />
        </span>
      </button>

      {terbuka && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-[#e2e8e1] bg-white p-2 shadow-[0_16px_40px_rgba(36,53,39,.16)]">
          <input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Cari nama provinsi…" aria-label="Cari provinsi"
            className="mb-1.5 min-h-10 w-full rounded-xl border border-[#e4e9e2] bg-[#fbfcfa] px-3 text-xs font-medium text-[#344638] outline-none placeholder:text-[#969f94] focus:border-[#748f70]" />
          <button type="button" onClick={() => ubah(semuaTerpilih ? [] : [...daftarProvinsi])} aria-pressed={semuaTerpilih}
            className={`mb-1 flex min-h-9 w-full items-center gap-2 rounded-xl px-2.5 text-left text-xs font-bold transition ${semuaTerpilih ? "bg-[#eef5ea] text-[#33523a]" : "text-[#33523a] hover:bg-[#f6f8f5]"}`}>
            <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${semuaTerpilih ? "border-[#345d3a] bg-[#345d3a] text-white" : "border-[#c3cec0] bg-white text-transparent"}`}><Check size={11} /></span>
            {semuaTerpilih ? "Hapus semua pilihan" : "Pilih semua provinsi"}
          </button>
          <div className="grid max-h-56 gap-0.5 overflow-y-auto">
            {tampil.length ? tampil.map((item) => (
              <label key={item} className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition ${dipilih.includes(item) ? "bg-[#eef5ea] text-[#33523a]" : "text-[#4c5a4d] hover:bg-[#f6f8f5]"}`}>
                <input type="checkbox" checked={dipilih.includes(item)} onChange={() => toggle(item)} className="h-4 w-4 shrink-0 accent-[#345d3a]" />
                <span className="min-w-0 flex-1 truncate">{item}</span>
              </label>
            )) : <p className="px-2.5 py-2 text-xs text-[#636d63]">Provinsi tidak ditemukan.</p>}
          </div>
        </div>
      )}

      {dipilih.length > 0 && dipilih.length <= 8 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {dipilih.map((nama) => (
            <span key={nama} className="inline-flex items-center gap-1 rounded-full bg-[#eef3ea] py-1 pl-3 pr-2 text-xs font-bold text-[#33523a]">
              {nama}
              <button type="button" onClick={() => ubah(dipilih.filter((item) => item !== nama))} aria-label={`Hapus ${nama}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-[#dce6d6]">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecipeShareForm({ recipeId }: { recipeId?: number }) {
  const router = useRouter();
  const sunting = typeof recipeId === "number";
  const [memuat, setMemuat] = useState(sunting);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [price, setPrice] = useState("");
  const [weather, setWeather] = useState<string[]>([]);
  const [water, setWater] = useState<string[]>([]);
  const [fishingTypes, setFishingTypes] = useState<string[]>(["Harian"]);
  const [provinsiDipilih, setProvinsiDipilih] = useState<string[]>([]);
  const [metaLama, setMetaLama] = useState<MetaLama>(metaAwal);
  const [ingredients, setIngredients] = useState<Bahan[]>([{ name: "", brand: "", amount: "", optional: false }]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [image, setImage] = useState("");
  const [galeri, setGaleri] = useState<string[]>([]);
  const [fotoBaru, setFotoBaru] = useState<{ file: File; url: string }[]>([]);
  const [thumbnailBaru, setThumbnailBaru] = useState<number | null>(null);
  const fotoBaruUrls = useRef<string[]>([]);
  const [detailTerbuka, setDetailTerbuka] = useState(false);
  const [error, setError] = useState("");
  const [sibuk, setSibuk] = useState(false);

  // Provinsi hanya diisi otomatis pada resep baru jika pengguna sudah memberi
  // izin lokasi eksplisit; ditolak/belum diatur tetap kosong tanpa fallback.
  const terapkanLokasi = useCallback((place: { province: string }) => {
    if (sunting) return;
    setProvinsiDipilih((cur) => (cur.length ? cur : [place.province]));
  }, [sunting]);
  const { markTouched: tandaiProvinsiDiubah } = useLocationAutofill(terapkanLokasi);

  const ubahProvinsi = (berikut: string[]) => {
    tandaiProvinsiDiubah();
    setProvinsiDipilih(berikut);
  };

  useEffect(() => {
    if (!sunting) return;
    let aktif = true;
    void fetch("/api/user/recipes", { headers: { Accept: "application/json" } })
      .then(async (r) => (r.ok ? (await r.json()) as { recipes?: CmsRecipeRecord[] } : { recipes: [] }))
      .then((body) => {
        if (!aktif) return;
        const resep = (body.recipes ?? []).find((item) => item.id === recipeId);
        if (!resep) { setError("Resep tidak ditemukan atau bukan milikmu."); setMemuat(false); return; }
        setTitle(resep.title);
        setSummary(resep.summary);
        setPrice(resep.price && resep.price !== BIAYA_BAWAAN_RESEP ? resep.price : "");
        setWeather(resep.weather ?? []);
        setWater(resep.water ?? []);
        setFishingTypes(resep.fishingTypes?.length ? resep.fishingTypes : ["Harian"]);
        setProvinsiDipilih(resep.provinces ?? []);
        setMetaLama({
          difficulty: resep.difficulty || "Mudah",
          waterBodies: resep.waterBodies ?? ["Kolam"],
          seasons: resep.seasons ?? [],
          suitable: resep.suitable ?? [],
          notSuitable: resep.notSuitable ?? [],
        });
        setIngredients(
          resep.ingredients?.length
            ? resep.ingredients.map((b) => ({
                name: b.name,
                brand: b.brand === "-" ? "" : b.brand,
                amount: b.amount,
                optional: Boolean(b.optional),
              }))
            : [{ name: "", brand: "", amount: "", optional: false }],
        );
        setSteps(resep.steps?.length ? resep.steps : [""]);
        setImage(resep.image ?? "");
        setGaleri(resep.images?.length ? resep.images : (resep.image && resep.image !== "/images/recipe-putih.jpg" ? [resep.image] : []));
        setMemuat(false);
      })
      .catch(() => { if (aktif) { setError("Resep belum dapat dimuat. Coba muat ulang halaman."); setMemuat(false); } });
    return () => { aktif = false; };
  }, [recipeId, sunting]);

  useEffect(() => () => { fotoBaruUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const bahanTerisi = ingredients.filter((b) => b.name.trim() || b.brand.trim() || b.amount.trim());
  const bahanLengkap = bahanTerisi.filter((b) => b.name.trim() && b.amount.trim());
  const langkahTerisi = steps.map((s) => s.trim()).filter(Boolean);
  const fotoPratinjau = (thumbnailBaru !== null && fotoBaru[thumbnailBaru]?.url) || image || galeri[0] || fotoBaru[0]?.url || "/images/recipe-putih.jpg";
  const pratinjauLokal = thumbnailBaru !== null || (!image && fotoBaru.length > 0);
  const totalFoto = galeri.length + fotoBaru.length;
  const biayaEfektif = price.trim() || BIAYA_BAWAAN_RESEP;

  const ringkasanOpsional = [
    provinsiDipilih.length ? (provinsiDipilih.length === 1 ? provinsiDipilih[0] : `${provinsiDipilih.length} provinsi`) : "",
    weather.length ? weather.slice(0, 2).join(", ") : "",
    water.length ? `Air ${water.slice(0, 2).join(", ").toLowerCase()}` : "",
    price.trim() ? PILIHAN_BIAYA_CEPAT.find((b) => b.value === price.trim())?.label ?? price.trim() : "",
  ].filter(Boolean);

  async function tambahFotoBaru(files: File[]) {
    const dipilih = [...files].slice(0, Math.max(0, 5 - totalFoto));
    if (dipilih.length < files.length) setError("Satu resep maksimal 5 foto. Hapus foto lain dulu.");
    const baru = await Promise.all(dipilih.map(async (file) => {
      const hasil = await kompresGambar(file, { lebarMaks: 1280, targetBytes: 200_000 });
      return { file: hasil.file, url: URL.createObjectURL(hasil.file) };
    }));
    baru.forEach((item) => fotoBaruUrls.current.push(item.url));
    if (baru.length) setFotoBaru((cur) => [...cur, ...baru].slice(0, Math.max(0, 5 - galeri.length)));
  }

  function hapusFotoTersimpan(url: string) {
    const berikut = galeri.filter((item) => item !== url);
    setGaleri(berikut);
    if (image === url) setImage(berikut[0] ?? "");
  }

  function hapusFotoBaru(indeks: number) {
    const item = fotoBaru[indeks];
    if (item) { URL.revokeObjectURL(item.url); fotoBaruUrls.current = fotoBaruUrls.current.filter((url) => url !== item.url); }
    setFotoBaru((cur) => cur.filter((_, i) => i !== indeks));
    setThumbnailBaru((cur) => (cur === null || cur < indeks ? cur : cur === indeks ? null : cur - 1));
  }

  function tempelLangkah(indeks: number, event: ClipboardEvent<HTMLTextAreaElement>) {
    const teks = event.clipboardData.getData("text");
    if (!teks.includes("\n")) return;
    const baris = teks.split(/\r?\n/).map((b) => b.replace(/^\d+\s*[.)]\s*/, "").trim()).filter(Boolean);
    if (baris.length <= 1) return;
    event.preventDefault();
    setSteps((cur) => {
      const awal = cur[indeks]?.trim();
      const sisipan = awal ? [`${awal} ${baris[0]}`.slice(0, 500), ...baris.slice(1).map((b) => b.slice(0, 500))] : baris.map((b) => b.slice(0, 500));
      return [...cur.slice(0, indeks), ...sisipan, ...cur.slice(indeks + 1)].slice(0, 40);
    });
  }

  const statusIsi = [
    { label: "Judul minimal 3 karakter", selesai: title.trim().length >= 3 },
    { label: "Cerita singkat minimal 10 karakter", selesai: summary.trim().length >= 10 },
    { label: "Minimal satu jenis kolam dipilih", selesai: fishingTypes.length > 0 },
    { label: "Minimal satu bahan beserta takaran", selesai: bahanTerisi.length > 0 && bahanLengkap.length === bahanTerisi.length },
    { label: "Minimal satu langkah meracik", selesai: langkahTerisi.length > 0 },
  ];

  async function kirim(event: FormEvent) {
    event.preventDefault();
    setError("");
    const bahanBersih = bahanTerisi.map((b) => ({
      name: b.name.trim(),
      brand: b.brand.trim() === "-" ? "" : b.brand.trim(),
      amount: b.amount.trim(),
      optional: b.optional,
    }));
    if (title.trim().length < 3) { setError("Judul minimal 3 karakter."); return; }
    if (summary.trim().length < 10) { setError("Cerita singkat minimal 10 karakter — tulis 1–2 kalimat tentang racikanmu."); return; }
    if (!fishingTypes.length) { setError("Pilih minimal satu jenis kolam (Harian, Lomba, atau Galatama)."); return; }
    if (!bahanBersih.length || bahanBersih.some((b) => !b.name || !b.amount)) { setError("Lengkapi nama dan takaran pada setiap bahan (merek boleh dikosongkan)."); return; }
    const langkahBersih = steps.map((s) => s.trim()).filter(Boolean);
    if (!langkahBersih.length) { setError("Tulis minimal satu langkah meracik."); return; }

    const payload = {
      title: title.trim(),
      summary: summary.trim(),
      difficulty: metaLama.difficulty,
      price: biayaEfektif,
      weather,
      water,
      waterBodies: metaLama.waterBodies,
      fishingTypes,
      provinces: provinsiDipilih,
      seasons: metaLama.seasons,
      ingredients: bahanBersih,
      steps: langkahBersih,
      suitable: metaLama.suitable,
      notSuitable: metaLama.notSuitable,
      ...(sunting ? { image: image || "/images/recipe-putih.jpg", images: galeri } : {}),
    };
    setSibuk(true);
    try {
      const respons = await fetch(sunting ? `/api/user/recipes/${recipeId}` : "/api/user/recipes", {
        method: sunting ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await respons.json().catch(() => ({}))) as { recipe?: CmsRecipeRecord; error?: string };
      if (!respons.ok || !data.recipe) { setSibuk(false); setError(data.error ?? "Resep gagal disimpan. Periksa isian lalu coba lagi."); return; }
      for (const [indeks, item] of fotoBaru.entries()) {
        const form = new FormData();
        form.append("file", item.file);
        if (thumbnailBaru === indeks) form.append("thumbnail", "1");
        const unggah = await fetch(`/api/user/recipes/${data.recipe.id}/photo`, { method: "POST", body: form });
        if (!unggah.ok) {
          const gagal = (await unggah.json().catch(() => ({}))) as { error?: string };
          setSibuk(false);
          setError(`Resep tersimpan, tetapi foto gagal diunggah: ${gagal.error ?? "coba sunting resep untuk mengunggah ulang."}`);
          router.push("/profil?tab=resep");
          return;
        }
      }
      router.push(`/resep/${data.recipe.slug}`);
      router.refresh();
    } catch {
      setSibuk(false);
      setError("Koneksi bermasalah. Resep belum terkirim, coba lagi.");
    }
  }

  if (memuat) return <p className="inline-flex items-center gap-2 text-sm text-[#636d63]"><LoaderCircle size={17} className="animate-spin" /> Memuat resepmu…</p>;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={kirim} className="min-w-0 space-y-6 rounded-[28px] border border-[#e6eae3] bg-white p-5 shadow-[0_18px_50px_rgba(38,55,40,.06)] sm:p-8">
        <label className="block">
          <span className={labelClass}>Judul racikan</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="Mis. Umpan Jagung Kukus Andalan" className={inputClass} />
        </label>

        <div>
          <span className={labelClass}>Foto hasil racikan <span className="font-medium text-[#636d63]">(opsional, maks 5 · persegi 1:1)</span></span>
          {(galeri.length > 0 || fotoBaru.length > 0) && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {galeri.map((url) => (
                <div key={url} className={`relative aspect-square overflow-hidden rounded-xl bg-[#eef3ea] ${thumbnailBaru === null && url === image ? "ring-2 ring-[#294b34] ring-offset-1" : ""}`}>
                  <Image src={url} alt="" fill sizes="120px" className="object-cover" />
                  {thumbnailBaru === null && url === image && <span className="absolute left-1.5 top-1.5 rounded-full bg-[#16251b]/80 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">Thumbnail</span>}
                  <span className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
                    <button type="button" disabled={thumbnailBaru === null && url === image} onClick={() => { setImage(url); setThumbnailBaru(null); }} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white/95 px-1.5 text-[9px] font-extrabold text-[#315a39] shadow-sm transition hover:bg-white disabled:opacity-60"><Check size={11} /> Utama</button>
                    <button type="button" onClick={() => hapusFotoTersimpan(url)} aria-label="Hapus foto" className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-[#8a4433] shadow-sm transition hover:bg-white"><Trash2 size={12} /></button>
                  </span>
                </div>
              ))}
              {fotoBaru.map((item, indeks) => (
                <div key={item.url} className={`relative aspect-square overflow-hidden rounded-xl bg-[#eef3ea] ${thumbnailBaru === indeks ? "ring-2 ring-[#294b34] ring-offset-1" : ""}`}>
                  <Image src={item.url} alt="" fill sizes="120px" unoptimized className="object-cover" />
                  {thumbnailBaru === indeks && <span className="absolute left-1.5 top-1.5 rounded-full bg-[#16251b]/80 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">Thumbnail</span>}
                  <span className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
                    <button type="button" disabled={thumbnailBaru === indeks} onClick={() => setThumbnailBaru(indeks)} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-white/95 px-1.5 text-[9px] font-extrabold text-[#315a39] shadow-sm transition hover:bg-white disabled:opacity-60"><Check size={11} /> Utama</button>
                    <button type="button" onClick={() => hapusFotoBaru(indeks)} aria-label="Hapus foto" className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-[#8a4433] shadow-sm transition hover:bg-white"><Trash2 size={12} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#eef3ea] px-4 text-sm font-bold text-[#2f5b3a] transition hover:bg-[#e2ecdf] ${totalFoto >= 5 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              <Camera size={17} /> {totalFoto ? "Tambah foto" : "Pilih foto"}
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => { const files = e.target.files ? [...e.target.files] : []; e.target.value = ""; if (files.length) void tambahFotoBaru(files); }} />
            </label>
            <span className="text-xs text-[#636d63]">PNG, JPEG, atau WebP · {totalFoto}/5 foto · otomatis dikompres agar ringan.</span>
          </div>
        </div>

        <label className="block">
          <span className={labelClass}>Cerita singkat</span>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={1500} rows={3} placeholder="Tulis 1–2 kalimat singkat tentang keunggulan atau kapan racikan ini paling jalan." className={`${inputClass} py-3`} />
        </label>

        <Pilihan judul="Jenis kolam (pilih minimal satu)" opsi={FISHING_TYPES} dipilih={fishingTypes} ubah={setFishingTypes} />

        <fieldset>
          <legend className={labelClass}>Bahan-bahan <span className="font-medium text-[#636d63]">(merek boleh kosong)</span></legend>
          <div className="space-y-2.5">
            {ingredients.map((bahan, i) => (
              <div key={i} className="grid gap-2 rounded-2xl bg-[#f8faf6] p-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,1fr)_auto] sm:items-center">
                <input value={bahan.name} onChange={(e) => setIngredients((cur) => cur.map((b, j) => j === i ? { ...b, name: e.target.value } : b))} placeholder="Nama bahan (mis. Kroto)" aria-label={`Nama bahan ${i + 1}`} maxLength={120} className={inputClass} />
                <input value={bahan.amount} onChange={(e) => setIngredients((cur) => cur.map((b, j) => j === i ? { ...b, amount: e.target.value } : b))} placeholder="Takaran (mis. 1 ons)" aria-label={`Takaran bahan ${i + 1}`} maxLength={120} className={inputClass} />
                <input value={bahan.brand} onChange={(e) => setIngredients((cur) => cur.map((b, j) => j === i ? { ...b, brand: e.target.value } : b))} placeholder="Merek (opsional)" aria-label={`Merek bahan ${i + 1}`} maxLength={120} className={inputClass} />
                <span className="flex items-center justify-between gap-2 sm:justify-end">
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-xs font-bold text-[#4b5b4e]">
                    <input type="checkbox" checked={bahan.optional} onChange={(e) => setIngredients((cur) => cur.map((b, j) => j === i ? { ...b, optional: e.target.checked } : b))} className="h-4 w-4 accent-[#294b34]" /> Opsional
                  </label>
                  {ingredients.length > 1 ? (
                    <button type="button" aria-label={`Hapus bahan ${i + 1}`} onClick={() => setIngredients((cur) => cur.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-lg bg-[#fbf0ec] text-[#8a4433] transition hover:bg-[#f6e3dc]">
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setIngredients((cur) => [...cur, { name: "", brand: "", amount: "", optional: false }])} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#eef3ea] px-3.5 text-sm font-bold text-[#2f5b3a] transition hover:bg-[#e2ecdf]">
            <Plus size={15} /> Tambah bahan
          </button>
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Cara meracik</legend>
          <div className="space-y-2.5">
            {steps.map((langkah, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-3 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eef3ea] text-xs font-black text-[#2f5b3a]">{i + 1}</span>
                <textarea value={langkah} onPaste={(e) => tempelLangkah(i, e)} onChange={(e) => setSteps((cur) => cur.map((s, j) => j === i ? e.target.value : s))} rows={2} maxLength={500} placeholder="Tulis satu langkah meracik…" aria-label={`Langkah ${i + 1}`} className={`${inputClass} py-3`} />
                {steps.length > 1 ? (
                  <button type="button" aria-label={`Hapus langkah ${i + 1}`} onClick={() => setSteps((cur) => cur.filter((_, j) => j !== i))} className="mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#fbf0ec] text-[#8a4433] transition hover:bg-[#f6e3dc]">
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSteps((cur) => [...cur, ""])} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#eef3ea] px-3.5 text-sm font-bold text-[#2f5b3a] transition hover:bg-[#e2ecdf]">
            <Plus size={15} /> Tambah langkah
          </button>
        </fieldset>

        <div className="rounded-2xl border border-[#e3e9df] bg-[#fafbf9]">
          <button type="button" aria-expanded={detailTerbuka} onClick={() => setDetailTerbuka((cur) => !cur)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#2f4534]">
                {detailTerbuka ? "Sembunyikan kondisi & daerah" : "+ Lengkapi kondisi & daerah (opsional)"}
              </p>
              <p className="mt-0.5 truncate text-xs text-[#616d61]">
                {ringkasanOpsional.length ? ringkasanOpsional.join(" · ") : "Cuaca, kondisi air, provinsi, dan perkiraan biaya bahan"}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              {ringkasanOpsional.length > 0 && <span className="rounded-full bg-[#e8f0e4] px-2.5 py-0.5 text-[11px] font-extrabold text-[#31593a]">{ringkasanOpsional.length} terisi</span>}
              <ChevronDown size={17} aria-hidden="true" className={`text-[#5a695b] transition ${detailTerbuka ? "rotate-180" : ""}`} />
            </span>
          </button>

          {detailTerbuka && (
            <div className="space-y-5 border-t border-[#e7ece4] p-4 sm:p-5">
              <Pilihan judul="Cuaca yang cocok" opsi={WEATHER_CONDITIONS} dipilih={weather} ubah={setWeather} />
              <Pilihan judul="Kondisi air yang cocok" opsi={WATER_CONDITIONS} dipilih={water} ubah={setWater} />

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#344638]">Provinsi asal / yang cocok</span>
                  <UseMyLocationButton
                    label="Isi dari lokasiku"
                    onPlace={(place) => {
                      tandaiProvinsiDiubah();
                      setProvinsiDipilih((cur) => (cur.includes(place.province) ? cur : [...cur, place.province]));
                    }}
                    onForget={() => {
                      tandaiProvinsiDiubah();
                      setProvinsiDipilih([]);
                    }}
                  />
                </div>
                <ProvinsiDropdown dipilih={provinsiDipilih} ubah={ubahProvinsi} />
              </div>

              <fieldset>
                <legend className={labelClass}>Perkiraan biaya bahan</legend>
                <div className="flex flex-wrap gap-2">
                  {PILIHAN_BIAYA_CEPAT.map((opsi) => {
                    const aktif = price === opsi.value;
                    return (
                      <button key={opsi.value} type="button" aria-pressed={aktif}
                        onClick={() => setPrice(aktif ? "" : opsi.value)}
                        className={`min-h-10 rounded-full px-4 text-[13px] font-bold transition ${aktif ? "bg-[#294b34] text-white" : "bg-white text-[#4b5b4e] ring-1 ring-[#dfe5dc] hover:bg-[#eef3ea]"}`}>
                        {opsi.label}
                      </button>
                    );
                  })}
                </div>
                {price && !PILIHAN_BIAYA_CEPAT.some((opsi) => opsi.value === price) && (
                  <p className="mt-2 text-xs text-[#616d61]">Biaya tersimpan saat ini: <strong>{price}</strong></p>
                )}
              </fieldset>
            </div>
          )}
        </div>

        {error ? <p role="alert" className="rounded-xl bg-[#fbf0ec] px-4 py-3 text-sm leading-6 text-[#8a4433]">{error}</p> : null}
        <button type="submit" disabled={sibuk} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#223f2b] disabled:opacity-60 sm:w-auto sm:min-w-56">
          {sibuk ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />} {sunting ? "Simpan perubahan" : "Bagikan & tayangkan resep"}
        </button>
        <p className="text-xs leading-5 text-[#636d63]">Resepmu langsung tayang di katalog atas nama {sunting ? "kamu" : "akunmu"}. Isi bahan dan langkah sejujur pengalamanmu. Admin bisa mengarsipkan resep yang menyesatkan.</p>
      </form>

      <aside className="mx-auto w-full min-w-0 max-w-4xl xl:mx-0 xl:max-w-none xl:sticky xl:top-24" aria-labelledby="pratinjau-resep-title">
        <section className="rounded-[28px] border border-[#e6eae3] bg-[#f8faf6] p-4 shadow-[0_18px_50px_rgba(38,55,40,.05)] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f0e3] text-[#41663f]"><Eye size={19} /></span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#636d63]">Pratinjau langsung</p>
              <h2 id="pratinjau-resep-title" className="mt-0.5 text-base font-extrabold text-[#2d4032]">Tampilan resepmu</h2>
            </div>
          </div>

          <article className="mt-4 overflow-hidden rounded-[22px] border border-[#e5eae2] bg-white shadow-[0_10px_30px_rgba(41,55,43,.07)]">
            <div className="relative aspect-square w-full overflow-hidden bg-[#e8e6d9]">
              <Image src={fotoPratinjau} alt={title.trim() ? `Foto pratinjau ${title.trim()}` : "Foto pratinjau resep"} fill sizes="(max-width: 1279px) 100vw, 360px" unoptimized={pratinjauLokal} className="object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-[#172b20]/55 via-transparent to-transparent" />
              <span className="absolute left-3.5 top-3.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-[#3a513d] backdrop-blur-sm">{fishingTypes[0] ?? "Harian"}</span>
              <div className="absolute bottom-3.5 left-4 text-white"><p className="text-[11px] font-medium text-white/80">Racikan komunitas</p><p className="text-xs font-bold">Ikan mas</p></div>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="line-clamp-2 text-[17px] font-extrabold tracking-tight text-[#223528]">{title.trim() || "Judul racikanmu akan tampil di sini"}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#626d63]">{summary.trim() || "Cerita singkat racikanmu akan tampil di sini."}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#eef3ea] px-2.5 py-1.5 text-[11px] font-bold text-[#40513f]">{fishingTypes[0] ?? "Harian"}</span>
                {weather[0] && <span className="rounded-full bg-[#fbf3df] px-2.5 py-1.5 text-[11px] font-bold text-[#6c5a2e]">{weather[0]}</span>}
                {water[0] && <span className="rounded-full bg-[#eef3ea] px-2.5 py-1.5 text-[11px] font-bold text-[#40513f]">{water[0]}</span>}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf0eb] pt-3.5">
                <div><dt className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#666e65]">Estimasi biaya</dt><dd className="mt-0.5 text-sm font-extrabold text-[#26382b]">{biayaEfektif}</dd></div>
                <div className="text-right"><dt className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#666e65]">Kesulitan</dt><dd className="mt-0.5 text-xs font-semibold text-[#59675a]">{metaLama.difficulty}</dd></div>
              </dl>
            </div>
          </article>

          <section className="mt-5" aria-labelledby="kelengkapan-resep-title">
            <h3 id="kelengkapan-resep-title" className="text-sm font-extrabold text-[#344638]">Kelengkapan inti</h3>
            <ul className="mt-3 space-y-2">
              {statusIsi.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-xs leading-5 text-[#5c685c]">
                  {item.selesai ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#4f7a4c]" /> : <Circle size={16} className="mt-0.5 shrink-0 text-[#8a9389]" />}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5 border-t border-[#e7ebe4] pt-4" aria-labelledby="bahan-pratinjau-title">
            <div className="flex items-center justify-between gap-3"><h3 id="bahan-pratinjau-title" className="text-sm font-extrabold text-[#344638]">Bahan terisi</h3><span className="text-[11px] font-bold text-[#636d63]">{bahanLengkap.length} siap</span></div>
            {bahanTerisi.length ? (
              <>
                <ul className="mt-3 space-y-2">
                  {bahanTerisi.slice(0, 4).map((bahan, index) => {
                    const merek = bahan.brand.trim() && bahan.brand.trim() !== "-" ? bahan.brand.trim() : "";
                    return (
                      <li key={`${bahan.name}-${index}`} className="flex items-start justify-between gap-3 text-xs leading-5 text-[#5c685c]">
                        <span className="min-w-0">
                          <span className="font-bold text-[#3c4c3e]">{bahan.name.trim() || "Bahan belum dinamai"}</span>
                          {merek ? <span className="text-[#636d63]"> · {merek}</span> : null}
                          {bahan.optional ? <span className="text-[#7a5f14]"> (opsional)</span> : null}
                        </span>
                        <span className="shrink-0 font-semibold text-[#445445]">{bahan.amount.trim() || "Takaran kosong"}</span>
                      </li>
                    );
                  })}
                </ul>
                {bahanTerisi.length > 4 ? <p className="mt-2 text-[11px] font-semibold text-[#636d63]">dan {bahanTerisi.length - 4} bahan lainnya</p> : null}
              </>
            ) : <p className="mt-2 text-xs leading-5 text-[#636d63]">Bahan yang kamu tulis akan diringkas di sini.</p>}
          </section>

          <section className="mt-5 border-t border-[#e7ebe4] pt-4" aria-labelledby="langkah-pratinjau-title">
            <h3 id="langkah-pratinjau-title" className="text-sm font-extrabold text-[#344638]">Langkah awal</h3>
            {langkahTerisi.length ? (
              <ol className="mt-3 space-y-2.5">
                {langkahTerisi.slice(0, 3).map((langkah, index) => (
                  <li key={`${langkah}-${index}`} className="flex items-start gap-2 text-xs leading-5 text-[#5c685c]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e8f0e3] text-[10px] font-black text-[#41663f]">{index + 1}</span><span className="line-clamp-2">{langkah}</span></li>
                ))}
              </ol>
            ) : <p className="mt-2 text-xs leading-5 text-[#636d63]">Tiga langkah pertama akan tampil sebagai ringkasan di sini.</p>}
          </section>
        </section>
      </aside>
    </div>
  );
}
