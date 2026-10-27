"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { mergeAppearance, type AppearanceState } from "@/lib/appearance";

/**
 * Pengambilan data tampilan dipakai bersama semua logo pada satu halaman
 * (janji yang sama dipakai ulang), agar tidak ada permintaan berulang ke
 * `/api/appearance`. Gagal mengambil tidak mengubah apa pun: alamat awal
 * (berkas terbaru dari route media) tetap ditampilkan.
 */
let appearancePromise: Promise<AppearanceState | null> | null = null;

function muatAppearance(): Promise<AppearanceState | null> {
  if (!appearancePromise) {
    appearancePromise = fetch("/api/appearance", { cache: "no-store" })
      .then(async (response) => (response.ok ? mergeAppearance(await response.json()) : null))
      .catch(() => null);
  }
  return appearancePromise;
}

/**
 * Logo dengan alamat berversi. Alamat logo tetap (`/api/media/logo`) dapat
 * terus menyajikan logo lama dari cache pengoptimal gambar/peramban setelah
 * logo diganti dari dashboard, jadi setelah data tampilan termuat, alamat
 * ditukar ke alamat berversi (`/api/media/logo-v<versi>`) yang berubah pada
 * setiap penggantian — pola yang sama seperti poster popup.
 */
export function AppearanceLogoImage({ slot, src: alamatAwal, alt, width, height, className, style }: {
  slot: "logo" | "footerLogo";
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [src, setSrc] = useState(alamatAwal);
  useEffect(() => {
    let aktif = true;
    void muatAppearance().then((state) => {
      if (aktif && state) setSrc(slot === "logo" ? state.logo.url : state.footerLogo.url);
    });
    return () => { aktif = false; };
  }, [slot]);
  return <Image src={src} alt={alt} width={width} height={height} className={className} style={style} />;
}
