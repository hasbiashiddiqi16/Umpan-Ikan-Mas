"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Plus, Send, Trash2 } from "lucide-react";
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
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState("");
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
        setMemuat(false);
      })
      .catch(() => { if (aktif) { setError("Resep belum dapat dimuat. Coba muat ulang halaman."); setMemuat(false); } });
    return () => { aktif = false; };
  }, [recipeId, sunting]);

  useEffect(() => () => { if (fotoUrl) URL.revokeObjectURL(fotoUrl); }, [fotoUrl]);

  const barisTeks = (teks: string) => teks.split("\n").map((b) => b.trim()).filter(Boolean);

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
      ...(sunting && image ? { image } : {}),
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
      if (foto) {
        const form = new FormData();
        form.append("file", foto);
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
    <form onSubmit={kirim} className="space-y-6 rounded-[28px] border border-[#e6eae3] bg-white p-6 shadow-[0_18px_50px_rgba(38,55,40,.06)] sm:p-8">
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
        <span className={labelClass}>Foto hasil racikan (opsional)</span>
        <div className="flex flex-wrap items-center gap-4">
          {(fotoUrl || image) ? <Image src={fotoUrl || image} alt="Pratinjau foto resep" width={160} height={110} unoptimized={Boolean(fotoUrl)} className="h-28 w-40 rounded-xl object-cover" /> : null}
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#eef3ea] px-4 text-sm font-bold text-[#2f5b3a] transition hover:bg-[#e2ecdf]">
            <Camera size={17} /> {foto || image ? "Ganti foto" : "Pilih foto"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFoto(f); setFotoUrl(f ? URL.createObjectURL(f) : ""); }} />
          </label>
          <span className="text-xs text-[#7c857c]">PNG, JPEG, atau WebP, maks 3 MB.</span>
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
      <p className="text-xs leading-5 text-[#7c857c]">Resepmu langsung tayang di katalog atas nama {sunting ? "kamu" : "akunmu"}. Mohon isi bahan dan langkah dengan jujur sesuai pengalamanmu; admin dapat mengarsipkan resep yang menyesatkan.</p>
    </form>
  );
}
