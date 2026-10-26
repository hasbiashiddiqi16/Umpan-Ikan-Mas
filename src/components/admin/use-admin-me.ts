"use client";

import { useEffect, useState } from "react";
import { canRole, type AdminCapability, type AdminRole } from "@/lib/admin-roles";

export type AdminMe = {
  username: string;
  role: AdminRole;
  roleLabel: string;
  primary: boolean;
};

// Hasil `/api/auth/me` disimpan sekali per pemuatan halaman: identitas sesi
// tidak berubah selama sesi hidup (perubahan peran mengakhiri sesi), jadi
// aman dipakai bersama bilah sisi dan semua pengelola dashboard.
let cached: Promise<AdminMe | null> | null = null;

function loadAdminMe(): Promise<AdminMe | null> {
  cached ??= fetch("/api/auth/me", { cache: "no-store" })
    .then(async (response) => (response.ok ? ((await response.json()) as AdminMe) : null))
    .catch(() => null);
  return cached;
}

/** Identitas admin yang sedang masuk; `null` selama masih dimuat/gagal. */
export function useAdminMe(): AdminMe | null {
  const [me, setMe] = useState<AdminMe | null>(null);

  useEffect(() => {
    let active = true;
    loadAdminMe().then((data) => {
      if (active) setMe(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return me;
}

/**
 * Bolehkan peran saat ini melakukan kapabilitas ini di tampilan? Selama
 * identitas belum termuat hasilnya `true` supaya tombol tidak berkedip;
 * begitu termuat, peran tanpa izin mendapat `false` dan kontrol ubahnya
 * dinonaktifkan. Penegakan yang menentukan tetap di server.
 */
export function adminCan(me: AdminMe | null, capability: AdminCapability): boolean {
  return !me || canRole(me.role, capability);
}
