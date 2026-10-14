"use client";

import { useEffect, useState } from "react";
import type { UserPreferences } from "@/lib/recommendation";

/**
 * Pilihan pengunjung yang tersimpan di perangkatnya sendiri.
 *
 * Skor kecocokan ("Match") hanya boleh muncul setelah pengunjung mengisi
 * sesuatu — kondisi di Cari Cepat, langkah AI Umpan, filter katalog, atau
 * provinsi hasil izin lokasi. Selama belum ada isian, halaman menampilkan label
 * "Populer" (dari jumlah ulasan nyata) alih-alih persentase yang tidak jelas
 * asalnya.
 */
export const VISITOR_PREFERENCES_KEY = "umpan-mas-preferences-v1";
export const VISITOR_PREFERENCES_EVENT = "umpan:preferences-change";

const FIELDS = ["province", "weather", "water", "waterBody", "fishingType", "season", "budget"] as const;

function bersihkan(value: unknown): UserPreferences {
  if (!value || typeof value !== "object") return {};
  const sumber = value as Record<string, unknown>;
  const hasil: UserPreferences = {};
  for (const field of FIELDS) {
    const isi = sumber[field];
    if (typeof isi === "string" && isi.trim()) hasil[field] = isi.trim();
  }
  return hasil;
}

export function readVisitorPreferences(): UserPreferences {
  if (typeof window === "undefined") return {};
  try {
    const tersimpan = window.localStorage.getItem(VISITOR_PREFERENCES_KEY);
    return tersimpan ? bersihkan(JSON.parse(tersimpan)) : {};
  } catch {
    return {};
  }
}

export function hasVisitorPreferences(preferences: UserPreferences = readVisitorPreferences()): boolean {
  return Object.keys(bersihkan(preferences)).length > 0;
}

/** Menyimpan isian pengunjung (digabung dengan yang sudah ada) dan memberi tahu komponen lain. */
export function saveVisitorPreferences(partial: UserPreferences): UserPreferences {
  const next = { ...readVisitorPreferences(), ...bersihkan(partial) };
  try {
    window.localStorage.setItem(VISITOR_PREFERENCES_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan diblokir: pilihan tetap dipakai di halaman ini lewat event di bawah.
  }
  window.dispatchEvent(new CustomEvent(VISITOR_PREFERENCES_EVENT, { detail: next }));
  return next;
}

export function clearVisitorPreferences() {
  try {
    window.localStorage.removeItem(VISITOR_PREFERENCES_KEY);
  } catch {
    // diabaikan
  }
  window.dispatchEvent(new CustomEvent(VISITOR_PREFERENCES_EVENT, { detail: {} }));
}

/**
 * Membaca isian pengunjung setelah hidrasi. Nilai pertama selalu kosong supaya
 * HTML dari server dan render pertama di klien sama (tidak ada kedipan/keliru
 * hidrasi), lalu terisi dari localStorage.
 */
export function useVisitorPreferences(): UserPreferences {
  const [preferences, setPreferences] = useState<UserPreferences>({});

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = (event as CustomEvent<UserPreferences> | undefined)?.detail;
      setPreferences(detail ? bersihkan(detail) : readVisitorPreferences());
    };
    sync();
    window.addEventListener(VISITOR_PREFERENCES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(VISITOR_PREFERENCES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return preferences;
}
