"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Galeri foto resep di halaman detail. Semua foto ditampilkan persegi 1:1
 * (dipotong `object-cover`), foto utama mengikuti thumbnail pilihan
 * (`image`), dan strip di bawahnya mengganti foto utama saat diklik.
 * Bila hanya ada satu foto, strip tidak ditampilkan.
 */
export function RecipeGallery({ name, image, images, imageAlt, badgeLabel, badgeTitle }: {
  name: string;
  image: string;
  images: string[];
  imageAlt: string;
  badgeLabel: string;
  badgeTitle: string;
}) {
  const galeri = images.length ? images : [image];
  const [aktif, setAktif] = useState(() => {
    const indeks = galeri.indexOf(image);
    return indeks >= 0 ? indeks : 0;
  });
  const terpilih = galeri[aktif] ?? image;

  return (
    <div className="min-w-0">
      <div className="relative aspect-square w-full overflow-hidden bg-[#e4e3d6]">
        <Image
          src={terpilih}
          alt={aktif > 0 ? `${imageAlt} — foto ke-${aktif + 1} dari ${galeri.length}` : imageAlt}
          fill
          sizes="(max-width: 1023px) 100vw, 48vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b3022]/35 via-transparent to-transparent" />
        <span title={badgeTitle} className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] break-words rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#3a513d] backdrop-blur-sm">{badgeLabel} · Ikan mas</span>
        {galeri.length > 1 && <span className="absolute bottom-4 right-4 rounded-full bg-[#16251b]/70 px-2.5 py-1 text-[11px] font-bold text-white">{aktif + 1} / {galeri.length}</span>}
      </div>
      {galeri.length > 1 && (
        <div className="flex gap-2 overflow-x-auto bg-white p-3" role="group" aria-label={`Foto ${name}`}>
          {galeri.map((url, indeks) => (
            <button
              key={`${url}-${indeks}`}
              type="button"
              onClick={() => setAktif(indeks)}
              aria-pressed={indeks === aktif}
              aria-label={`Lihat foto ke-${indeks + 1}${url === image ? " (thumbnail)" : ""}`}
              className={`relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#edf1ea] transition sm:h-20 sm:w-20 ${indeks === aktif ? "ring-2 ring-[#294b34] ring-offset-2" : "opacity-75 hover:opacity-100"}`}
            >
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              {url === image && <span className="absolute bottom-1 left-1 rounded-full bg-[#16251b]/75 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">Utama</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
