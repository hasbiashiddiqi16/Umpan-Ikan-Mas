"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Cloud, Droplets, MapPin, Wallet, Waves } from "lucide-react";
import { provinces } from "@/data/provinces";
import { SectionHeader } from "@/components/shared";
import { SELECT_FIELD_CLASS, SelectBox } from "@/components/form-fields";
import { LocationConsentBanner, UseMyLocationButton } from "@/components/location-controls";
import { useLocationAutofill } from "@/lib/use-location";
import { saveVisitorPreferences } from "@/lib/visitor-preferences";

const controlClass = `${SELECT_FIELD_CLASS} min-h-12 w-full min-w-0 rounded-xl border border-[#e5e9e2] bg-white pl-3.5 text-sm font-medium text-[#304035] outline-none transition focus:border-[#6d896f] focus:ring-4 focus:ring-[#365b3d]/10`;

export function QuickFinder() {
  const router = useRouter();
  const [province, setProvince] = useState("");
  const [weather, setWeather] = useState("Hujan");
  const [water, setWater] = useState("Keruh");
  const [fishingType, setFishingType] = useState("Harian");
  const [budget, setBudget] = useState("Rp15.000–30.000");
  const { markTouched } = useLocationAutofill((place) => {
    setProvince(place.province);
    saveVisitorPreferences({ province: place.province });
  });

  function submitFinder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams({ weather, water, type: fishingType, budget, recommend: "1" });
    // Tanpa izin lokasi, provinsi dibiarkan kosong dan tidak ikut dikirim.
    if (province) params.set("province", province);
    // Pilihan ini dipakai halaman lain untuk menampilkan skor kecocokan —
    // skor hanya boleh muncul kalau pengunjung sudah mengisi sesuatu.
    saveVisitorPreferences({ province: province || undefined, weather, water, fishingType, budget });
    router.push(`/ai-umpan?${params.toString()}`);
  }

  return (
    <section id="finder" className="scroll-mt-24">
      <div className="mb-4"><LocationConsentBanner /></div>
      <div className="rounded-[28px] border border-[#e9ece6] bg-white p-5 shadow-[0_18px_55px_rgba(40,57,42,.08)] sm:p-7 lg:p-8">
        <SectionHeader eyebrow="Mulai dari kondisi hari ini" title="🎯 Cari Umpan yang Cocok" subtitle="Ceritakan sedikit tentang spot mancingmu. Aktifkan lokasi agar provinsi terisi otomatis, atau pilih manual." />
        <form onSubmit={submitFinder} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="md:col-span-2 xl:col-span-5">
            <UseMyLocationButton onPlace={(place) => setProvince(place.province)} label="Isi provinsi dari lokasi saya" />
            <p className="mt-2 text-[11px] leading-5 text-[#8a9389]">Tanpa izin lokasi, kolom provinsi tetap kosong. Kamu bisa memilihnya sendiri kapan saja.</p>
          </div>
          <label className="grid gap-2 text-xs font-bold text-[#687468]"><span className="inline-flex items-center gap-1.5"><MapPin size={14} /> Provinsi</span><SelectBox><select className={controlClass} value={province} onChange={(event) => { markTouched(); setProvince(event.target.value); }}><option value="">Pilih provinsi</option>{provinces.map((item) => <option key={item.slug}>{item.name}</option>)}</select></SelectBox></label>
          <label className="grid gap-2 text-xs font-bold text-[#687468]"><span className="inline-flex items-center gap-1.5"><Cloud size={14} /> Cuaca</span><SelectBox><select className={controlClass} value={weather} onChange={(event) => setWeather(event.target.value)}><option>Hujan</option><option>Mendung</option><option>Berawan</option><option>Cerah</option><option>Panas</option></select></SelectBox></label>
          <label className="grid gap-2 text-xs font-bold text-[#687468]"><span className="inline-flex items-center gap-1.5"><Droplets size={14} /> Kondisi air</span><SelectBox><select className={controlClass} value={water} onChange={(event) => setWater(event.target.value)}><option>Keruh</option><option>Hijau</option><option>Jernih</option><option>Kekuningan</option></select></SelectBox></label>
          <label className="grid gap-2 text-xs font-bold text-[#687468]"><span className="inline-flex items-center gap-1.5"><Waves size={14} /> Jenis kolam</span><SelectBox><select className={controlClass} value={fishingType} onChange={(event) => setFishingType(event.target.value)}><option>Harian</option><option>Lomba</option><option>Galatama</option></select></SelectBox></label>
          <label className="grid gap-2 text-xs font-bold text-[#687468]"><span className="inline-flex items-center gap-1.5"><Wallet size={14} /> Budget</span><SelectBox><select className={controlClass} value={budget} onChange={(event) => setBudget(event.target.value)}><option>&lt; Rp15.000</option><option>Rp15.000–30.000</option><option>Rp30.000–50.000</option><option>&gt; Rp50.000</option></select></SelectBox></label>
          <div className="pt-1 md:col-span-2 xl:col-span-5 xl:flex xl:justify-end">
            <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#294b34] px-7 text-sm font-bold text-white transition hover:bg-[#1f3c29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294b34] xl:w-auto">Temukan Umpan <ArrowRight size={17} /></button>
          </div>
        </form>
      </div>
    </section>
  );
}
