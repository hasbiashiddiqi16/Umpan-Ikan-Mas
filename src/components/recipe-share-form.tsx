"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, CheckCircle2, Circle, Eye, LoaderCircle, Plus, Send, Trash2 } from "lucide-react";
import { FISHING_TYPES, SEASON_CONDITIONS, WATER_BODIES, WATER_CONDITIONS, WEATHER_CONDITIONS } from "@/data/recipes";
import { provinces } from "@/data/provinces";
import type { CmsRecipeRecord } from "@/lib/cms";
import { SELECT_FIELD_CLASS, SelectBox } from "@/components/form-fields";

const inputClass = "min-h-12 w-full rounded-xl border border-[#e4e9e2] bg-white px-3.5 text-sm text-[#334436] outline-none transition placeholder:text-[#a0a79e] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";
const labelClass = "mb-1.5 block text-sm font-bold text-[#344638]";
const KESULITAN = ["Mudah", "Menengah", "Tingkat lanjut"];

type Bahan = { name: string; brand: string; amount: string; optional: boolean };

function Pilihan({ judul, opsi, dipilih, ubah }: { judul: string; opsi: readonly string[]; dipilih: string[]; ubah: (v: string[]) => void }) {
  const toggle = (nilai: string) => ubah(dipilih.includes(nilai) ? dipilih.filter((i) => i !== nilai) : [...dipilih, nilai]);
  // Tombol "Semua": memilih seluruh pilihan sekaligus; ditekan lagi untuk
  // mengosongkan. Hanya tampil bila pilihannya lebih dari satu.
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

export function RecipeShareForm({ recipeId }: { recipeId?: number }) {
  const router = useRouter();
  const sunting = typeof recipeId === "number";
  const [memuat, setMemuat] = useState(sunting);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [difficulty, setDifficulty] = useState("Mudah");
  const [price, setPrice] = useState("Rp15.000–30.000");
  const [weather, setWeather] = useState<string[]>([]);
  const [water, setWater] = useState<string[]>([]);
  const [waterBodies, setWaterBodies] = useState<string[]>(["Kolam"]);
  const [fishingTypes, setFishingTypes] = useState<string[]>(["Harian"]);
  const [provinsiDipilih, setProvinsiDipilih] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Bahan[]>([{ name: "", brand: "", amount: "", optional: false }]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [suitable, setSuitable] = useState("");
  const [notSuitable, setNotSuitable] = useState("");
  const [image, setImage] = useState("");
  const [galeri, setGaleri] = useState<string[]>([]);
  const [fotoBaru, setFotoBaru] = useState<{ file: File; url: string }[]>([]);
  const [thumbnailBaru, setThumbnailBaru] = useState<number | null>(null);
  const fotoBaruUrls = useRef<string[]>([]);
  const [error, setError] = useState("");
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (!sunting) return;
    let aktif = true;
    void fetch("/api/user/recipes", { headers: { Accept: "application/json" } })
      .then(async (r) => (r.ok ? (await r.json()) as { recipes?: CmsRecipeRecord[] } : { recipes: [] }))
      .then((body) => {
        if (!aktif) return;
        const resep = (body.recipes ?? []).find((item) => item.id === recipeId);
        if (!resep) { setError("Resep tidak ditemukan atau bukan milikmu."); setMemuat(false); return; }
        setTitle(resep.title); setSummary(resep.summary); setDifficulty(resep.difficulty); setPrice(resep.price);
        setWeather(resep.weather ?? []); setWater(resep.water ?? []); setWaterBodies(resep.waterBodies ?? []);
        setFishingTypes(resep.fishingTypes ?? []); setProvinsiDipilih(resep.provinces ?? []); setSeasons(resep.seasons ?? []);
        setIngredients((resep.ingredients ?? []).map((b) => ({ name: b.name, brand: b.brand, amount: b.amount, optional: Boolean(b.optional) })));
        setSteps(resep.steps?.length ? resep.steps : [""]);
        setSuitable((resep.suitable ?? []).join("\n")); setNotSuitable((resep.notSuitable ?? []).join("\n"));
        setImage(resep.image ?? "");
        setGaleri(resep.images?.length ? resep.images : (resep.image && resep.image !== "/images/recipe-putih.jpg" ? [resep.image] : []));
        setMemuat(false);
      })
      .catch(() => { if (aktif) { setError("Resep belum dapat dimuat. Coba muat ulang halaman."); setMemuat(false); } });
    return () => { aktif = false; };
  }, [recipeId, sunting]);

  useEffect(() => () => { fotoBaruUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const barisTeks = (teks: string) => teks.split("\n").map((b) => b.trim()).filter(Boolean);

  const bahanTerisi = ingredients.filter((b) => b.name.trim() || b.brand.trim() || b.amount.trim());
  const bahanLengkap = bahanTerisi.filter((b) => b.name.trim() && b.brand.trim() && b.amount.trim());
  const langkahTerisi = steps.map((s) => s.trim()).filter(Boolean);
  const fotoPratinjau = (thumbnailBaru !== null && fotoBaru[thumbnailBaru]?.url) || image || galeri[0] || fotoBaru[0]?.url || "/images/recipe-putih.jpg";
  const pratinjauLokal = thumbnailBaru !== null || (!image && fotoBaru.length > 0);
  const totalFoto = galeri.length + fotoBaru.length;

  // `files` wajib sudah berupa salinan array: FileList dari input bersifat
  // live dan ikut kosong begitu nilai input direset untuk memilih ulang.
  function tambahFotoBaru(files: File[]) {
    const dipilih = [...files].slice(0, Math.max(0, 5 - totalFoto));
    if (dipilih.length < files.length) setError("Satu resep maksimal 5 foto. Hapus foto lain dulu.");
    const baru = dipilih.map((file) => ({ file, url: URL.createObjectURL(file) }));
    baru.forEach((item) => fotoBaruUrls.current.push(item.url));
    if (baru.length) setFotoBaru((cur) => [...cur, ...baru]);
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
  const statusIsi = [
    { label: "Judul minimal 3 karakter", selesai: title.trim().length >= 3 },
    { label: "Ringkasan minimal 15 karakter", selesai: summary.trim().length >= 15 },
    { label: "Minimal satu jenis kolam dipilih", selesai: fishingTypes.length > 0 },
    { label: "Bahan terisi lengkap dengan merek dan takaran", selesai: bahanTerisi.length > 0 && bahanLengkap.length === bahanTerisi.length },
    { label: "Minimal satu langkah meracik", selesai: langkahTerisi.length > 0 },
  ];

  async function kirim(event: FormEvent) {
    event.preventDefault();
    setError("");
    const bahanBersih = ingredients.filter((b) => b.name.trim() || b.brand.trim() || b.amount.trim());
    if (title.trim().length < 3) { setError("Judul minimal 3 karakter."); return; }
    if (summary.trim().length < 15) { setError("Ringkasan minimal 15 karakter — ceritakan sedikit racikanmu."); return; }
    if (!fishingTypes.length) { setError("Pilih minimal satu jenis kolam (Harian, Lomba, atau Galatama)."); return; }
    if (!bahanBersih.length || bahanBersih.some((b) => !b.name.trim() || !b.brand.trim() || !b.amount.trim())) { setError("Lengkapi setiap bahan: nama, merek, dan takaran (tulis “-” bila tanpa merek)."); return; }
    const langkahBersih = steps.map((s) => s.trim()).filter(Boolean);
    if (!langkahBersih.length) { setError("Tulis minimal satu langkah meracik."); return; }

    const payload = {
      title: title.trim(), summary: summary.trim(), difficulty, price: price.trim() || "Rp15.000–30.000",
      weather, water, waterBodies, fishingTypes, provinces: provinsiDipilih, seasons,
      ingredients: bahanBersih, steps: langkahBersih,
      suitable: barisTeks(suitable), notSuitable: barisTeks(notSuitable),
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
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
      <form onSubmit={kirim} className="min-w-0 space-y-6 rounded-[28px] border border-[#e6eae3] bg-white p-6 shadow-[0_18px_50px_rgba(38,55,40,.06)] sm:p-8">
      <label className="block"><span className={labelClass}>Judul racikan</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="Mis. Umpan Jagung Kukus Andalan" className={inputClass} /></label>

      <label className="block"><span className={labelClass}>Ringkasan</span>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={1500} rows={4} placeholder="Ceritakan keunggulan racikan ini, kondisi yang cocok, dan hasilnya." className={`${inputClass} py-3`} /></label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block"><span className={labelClass}>Tingkat kesulitan</span>
          <SelectBox><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`${SELECT_FIELD_CLASS} min-h-12 w-full rounded-xl border border-[#e4e9e2] bg-white pl-3.5 text-sm text-[#334436] outline-none focus:border-[#748f70]`}>
            {KESULITAN.map((k) => <option key={k} value={k}>{k}</option>)}
          </select></SelectBox></label>
        <label className="block"><span className={labelClass}>Perkiraan biaya bahan</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} maxLength={80} placeholder="Rp15.000–30.000" className={inputClass} /></label>
      </div>

      <div>
        <span className={labelClass}>Foto hasil racikan (opsional, maks 5 · persegi 1:1)</span>
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
        <div className="flex flex-wrap items-center gap-4">
          <label className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#eef3ea] px-4 text-sm font-bold text-[#2f5b3a] transition hover:bg-[#e2ecdf] ${totalFoto >= 5 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
            <Camera size={17} /> {totalFoto ? "Tambah foto" : "Pilih foto"}
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => { const files = e.target.files ? [...e.target.files] : []; e.target.value = ""; if (files.length) tambahFotoBaru(files); }} />
          </label>
          <span className="text-xs text-[#7c857c]">PNG, JPEG, atau WebP, maks 3 MB per foto · {totalFoto}/5 foto.</span>
        </div>
      </div>

      <Pilihan judul="Jenis kolam (pilih minimal satu)" opsi={FISHING_TYPES} dipilih={fishingTypes} ubah={setFishingTypes} />
      <Pilihan judul="Cuaca yang cocok" opsi={WEATHER_CONDITIONS} dipilih={weather} ubah={setWeather} />
      <Pilihan judul="Kondisi air yang cocok" opsi={WATER_CONDITIONS} dipilih={water} ubah={setWater} />
      <Pilihan judul="Tipe air" opsi={WATER_BODIES} dipilih={waterBodies} ubah={setWaterBodies} />
      <Pilihan judul="Musim yang cocok" opsi={SEASON_CONDITIONS} dipilih={seasons} ubah={setSeasons} />
      <Pilihan judul="Provinsi asal / yang cocok" opsi={provinces.map((p) => p.name)} dipilih={provinsiDipilih} ubah={setProvinsiDipilih} />

      <fieldset>
        <legend className={labelClass}>Bahan-bahan</legend>
        <div className="space-y-3">
          {ingredients.map((bahan, i) => (
            <div key={i} className="grid gap-2 rounded-2xl bg-[#f8faf6] p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
              <input value={bahan.name} onChange={(e) => setIngredients((cur) => cur.map((b, j) => j === i ? { ...b, name: e.target.value } : b))} placeholder="Nama bahan (mis. Kroto)" maxLength={120} className={inputClass} />
              <input value={bahan.brand} onChange={(e) => setIngredients((cur) => cur.map((b, j) => j === i ? { ...b, brand: e.target.value } : b))} placeholder="Merek (atau -)" maxLength={120} className={inputClass} />
              <input value={bahan.amount} onChange={(e) => setIngredients((cur) => cur.map((b, j) => j === i ? { ...b, amount: e.target.value } : b))} placeholder="Takaran (mis. 1 ons)" maxLength={120} className={inputClass} />
              <span className="flex items-center gap-2">
                <label className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-[#4b5b4e]"><input type="checkbox" checked={bahan.optional} onChange={(e) => setIngredients((cur) => cur.map((b, j) => j === i ? { ...b, optional: e.target.checked } : b))} className="h-4 w-4 accent-[#294b34]" /> Opsional</label>
                {ingredients.length > 1 ? <button type="button" aria-label="Hapus bahan" onClick={() => setIngredients((cur) => cur.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-lg bg-[#fbf0ec] text-[#8a4433]"><Trash2 size={16} /></button> : null}
              </span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setIngredients((cur) => [...cur, { name: "", brand: "", amount: "", optional: false }])} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#eef3ea] px-3.5 text-sm font-bold text-[#2f5b3a]"><Plus size={15} /> Tambah bahan</button>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>Langkah meracik</legend>
        <div className="space-y-2.5">
          {steps.map((langkah, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-3 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eef3ea] text-xs font-black text-[#2f5b3a]">{i + 1}</span>
              <textarea value={langkah} onChange={(e) => setSteps((cur) => cur.map((s, j) => j === i ? e.target.value : s))} rows={2} maxLength={120} placeholder="Tulis satu langkah…" className={`${inputClass} py-3`} />
              {steps.length > 1 ? <button type="button" aria-label="Hapus langkah" onClick={() => setSteps((cur) => cur.filter((_, j) => j !== i))} className="mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#fbf0ec] text-[#8a4433]"><Trash2 size={16} /></button> : null}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setSteps((cur) => [...cur, ""])} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#eef3ea] px-3.5 text-sm font-bold text-[#2f5b3a]"><Plus size={15} /> Tambah langkah</button>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block"><span className={labelClass}>Cocok untuk (satu per baris, opsional)</span>
          <textarea value={suitable} onChange={(e) => setSuitable(e.target.value)} rows={4} placeholder={"Kolam harian air keruh\nIkan mas rame"} className={`${inputClass} py-3`} /></label>
        <label className="block"><span className={labelClass}>Kurang cocok untuk (satu per baris, opsional)</span>
          <textarea value={notSuitable} onChange={(e) => setNotSuitable(e.target.value)} rows={4} placeholder={"Air jernih mengalir\nCuaca sangat panas"} className={`${inputClass} py-3`} /></label>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-[#fbf0ec] px-4 py-3 text-sm leading-6 text-[#8a4433]">{error}</p> : null}
      <button type="submit" disabled={sibuk} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#223f2b] disabled:opacity-60 sm:w-auto sm:min-w-56">
        {sibuk ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />} {sunting ? "Simpan perubahan" : "Bagikan & tayangkan resep"}
      </button>
      <p className="text-xs leading-5 text-[#7c857c]">Resepmu langsung tayang di katalog atas nama {sunting ? "kamu" : "akunmu"}. Mohon isi bahan dan langkah dengan jujur sesuai pengalamanmu. Admin dapat mengarsipkan resep yang menyesatkan.</p>
      </form>

      <aside className="mx-auto w-full min-w-0 max-w-4xl xl:mx-0 xl:max-w-none xl:sticky xl:top-24" aria-labelledby="pratinjau-resep-title">
        <section className="rounded-[28px] border border-[#e6eae3] bg-[#f8faf6] p-4 shadow-[0_18px_50px_rgba(38,55,40,.05)] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f0e3] text-[#41663f]"><Eye size={19} /></span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#7a8577]">Pratinjau langsung</p>
              <h2 id="pratinjau-resep-title" className="mt-0.5 text-base font-extrabold text-[#2d4032]">Tampilan resepmu</h2>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#687466]">Perubahan pada formulir langsung tercermin di sini. Gunakan pratinjau ini untuk memeriksa judul, foto, dan ringkasan sebelum resep diterbitkan.</p>

          <article className="mt-4 overflow-hidden rounded-[22px] border border-[#e5eae2] bg-white shadow-[0_10px_30px_rgba(41,55,43,.07)]">
            <div className="relative aspect-square w-full overflow-hidden bg-[#e8e6d9]">
              <Image src={fotoPratinjau} alt={title.trim() ? `Foto pratinjau ${title.trim()}` : "Foto pratinjau resep"} fill sizes="(max-width: 1279px) 100vw, 370px" unoptimized={pratinjauLokal} className="object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-[#172b20]/55 via-transparent to-transparent" />
              <span className="absolute left-3.5 top-3.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-[#3a513d] backdrop-blur-sm">Racikan komunitas</span>
              <div className="absolute bottom-3.5 left-4 text-white"><p className="text-[11px] font-medium text-white/80">Racikan komunitas</p><p className="text-xs font-bold">Ikan mas</p></div>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="line-clamp-2 text-[17px] font-extrabold tracking-tight text-[#223528]">{title.trim() || "Judul racikanmu akan tampil di sini"}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#626d63]">{summary.trim() || "Ringkasan resep akan tampil di sini. Ceritakan keunggulan racikan dan kondisi yang paling cocok untuk mencobanya."}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#eef3ea] px-2.5 py-1.5 text-[11px] font-bold text-[#40513f]">{fishingTypes[0] ?? "Jenis kolam belum dipilih"}</span>
                <span className="rounded-full bg-[#fbf3df] px-2.5 py-1.5 text-[11px] font-bold text-[#6c5a2e]">{weather[0] ?? "Cuaca belum dipilih"}</span>
                <span className="rounded-full bg-[#eef3ea] px-2.5 py-1.5 text-[11px] font-bold text-[#40513f]">{water[0] ?? "Kondisi air belum dipilih"}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf0eb] pt-3.5">
                <div><dt className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#9aa098]">Estimasi biaya</dt><dd className="mt-0.5 text-sm font-extrabold text-[#26382b]">{price.trim() || "Rp15.000–30.000"}</dd></div>
                <div className="text-right"><dt className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#9aa098]">Kesulitan</dt><dd className="mt-0.5 text-xs font-semibold text-[#59675a]">{difficulty}</dd></div>
              </dl>
            </div>
          </article>

          <section className="mt-5" aria-labelledby="kelengkapan-resep-title">
            <h3 id="kelengkapan-resep-title" className="text-sm font-extrabold text-[#344638]">Kelengkapan resep</h3>
            <ul className="mt-3 space-y-2.5">
              {statusIsi.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-xs leading-5 text-[#5c685c]">
                  {item.selesai ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#4f7a4c]" /> : <Circle size={16} className="mt-0.5 shrink-0 text-[#a3aa9f]" />}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5 border-t border-[#e7ebe4] pt-4" aria-labelledby="bahan-pratinjau-title">
            <div className="flex items-center justify-between gap-3"><h3 id="bahan-pratinjau-title" className="text-sm font-extrabold text-[#344638]">Bahan terisi</h3><span className="text-[11px] font-bold text-[#7a8577]">{bahanLengkap.length} lengkap</span></div>
            {bahanTerisi.length ? (
              <>
                <ul className="mt-3 space-y-2">
                  {bahanTerisi.slice(0, 4).map((bahan, index) => (
                    <li key={`${bahan.name}-${index}`} className="flex items-start justify-between gap-3 text-xs leading-5 text-[#5c685c]"><span className="min-w-0"><span className="font-bold text-[#3c4c3e]">{bahan.name.trim() || "Bahan belum dinamai"}</span>{bahan.brand.trim() ? <span className="text-[#7a8577]"> · {bahan.brand.trim()}</span> : null}</span><span className="shrink-0 font-semibold text-[#445445]">{bahan.amount.trim() || "Takaran kosong"}</span></li>
                  ))}
                </ul>
                {bahanTerisi.length > 4 ? <p className="mt-2 text-[11px] font-semibold text-[#7a8577]">dan {bahanTerisi.length - 4} bahan lainnya</p> : null}
              </>
            ) : <p className="mt-2 text-xs leading-5 text-[#7a8577]">Bahan yang kamu tulis akan diringkas di sini.</p>}
          </section>

          <section className="mt-5 border-t border-[#e7ebe4] pt-4" aria-labelledby="langkah-pratinjau-title">
            <h3 id="langkah-pratinjau-title" className="text-sm font-extrabold text-[#344638]">Langkah awal</h3>
            {langkahTerisi.length ? (
              <ol className="mt-3 space-y-2.5">
                {langkahTerisi.slice(0, 3).map((langkah, index) => (
                  <li key={`${langkah}-${index}`} className="flex items-start gap-2 text-xs leading-5 text-[#5c685c]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e8f0e3] text-[10px] font-black text-[#41663f]">{index + 1}</span><span className="line-clamp-2">{langkah}</span></li>
                ))}
              </ol>
            ) : <p className="mt-2 text-xs leading-5 text-[#7a8577]">Tiga langkah pertama akan tampil sebagai ringkasan di sini.</p>}
          </section>
        </section>
      </aside>
    </div>
  );
}
