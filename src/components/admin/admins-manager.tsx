"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/shared";
import {
  ADMIN_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type AdminRole,
} from "@/lib/admin-roles";
import type { AdminUserPublic } from "@/lib/admin-users-server";

const labelClass = "grid gap-1.5 text-xs font-bold text-[#616c60] (4.71:1 terburuk)";
const inputClass = "min-h-11 w-full rounded-xl border border-[#e2e8e0] bg-white px-3.5 text-sm font-medium text-[#2b3b2d] outline-none transition focus:border-[#9db99b] focus:ring-2 focus:ring-[#dcebd8] disabled:opacity-60";
const hintClass = "text-[10px] font-medium leading-4 text-[#959c93]";

function fetchAdmins() {
  return fetch("/api/admin/admins", { cache: "no-store" })
    .then(async (response) => ({
      ok: response.ok,
      data: await response.json() as { admins?: AdminUserPublic[]; error?: string },
    }));
}

const formatDate = (value: string) => new Date(value).toLocaleString("id-ID", {
  day: "2-digit", month: "long", year: "numeric",
});

/**
 * Kelola akun admin tambahan (Task 114) — hanya tampil untuk Pemilik.
 * Admin utama dari environment tidak tercantum di sini dan tidak bisa
 * dihapus/dinonaktifkan dari dashboard.
 */
export function AdminsManager() {
  const [admins, setAdmins] = useState<AdminUserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("hanya_lihat");
  const [creating, setCreating] = useState(false);

  const [passwordFor, setPasswordFor] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    let active = true;
    fetchAdmins()
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) { setLoadError(data.error ?? "Daftar admin gagal dimuat."); return; }
        setAdmins(data.admins ?? []);
      })
      .catch(() => { if (active) setLoadError("Daftar admin gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function reload() {
    const { ok, data } = await fetchAdmins();
    if (ok) setAdmins(data.admins ?? []);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setCreating(true);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name, password, role }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; notice?: string };
      if (!response.ok) { setError(result.error ?? "Akun admin gagal dibuat."); return; }
      setNotice(result.notice ?? "Akun admin dibuat.");
      setUsername(""); setName(""); setPassword(""); setRole("hanya_lihat");
      await reload();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  async function patchAdmin(id: string, patch: Record<string, unknown>, fallback: string) {
    setError(""); setNotice(""); setBusyId(id);
    try {
      const response = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; notice?: string };
      if (!response.ok) { setError(result.error ?? fallback); return; }
      setNotice(result.notice ?? "Akun admin diperbarui.");
      await reload();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(admin: AdminUserPublic) {
    if (!window.confirm(`Hapus akun admin "${admin.username}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setError(""); setNotice(""); setBusyId(admin.id);
    try {
      const response = await fetch(`/api/admin/admins/${admin.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({})) as { error?: string; notice?: string };
      if (!response.ok) { setError(result.error ?? "Akun admin gagal dihapus."); return; }
      setNotice(result.notice ?? "Akun admin dihapus.");
      await reload();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setBusyId("");
    }
  }

  async function handleResetPassword(admin: AdminUserPublic) {
    if (!newPassword) { setError("Isi password baru terlebih dahulu."); return; }
    await patchAdmin(admin.id, { password: newPassword }, "Password gagal diganti.");
    setPasswordFor(""); setNewPassword("");
  }

  return (
    <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-[#344638]"><Users size={16} className="text-[#4d7351] (4.64:1 terburuk)" /> Admin tambahan</h2>
          <p className="mt-1 text-[10px] text-[#929a91]">Akun khusus dashboard dengan username + password sendiri dan batasan peran. Hanya Pemilik yang dapat mengelola bagian ini.</p>
        </div>
        <Badge tone="sage">Khusus Pemilik</Badge>
      </header>

      <div className="grid gap-6 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <form onSubmit={handleCreate} className="grid content-start gap-3">
          <h3 className="inline-flex items-center gap-2 text-xs font-extrabold text-[#344638]"><UserPlus size={14} /> Buat admin baru</h3>
          <label className={labelClass}>Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="mis. siti.editor" autoComplete="off" className={inputClass} />
            <span className={hintClass}>3–32 karakter: huruf kecil, angka, titik, strip, atau garis bawah. Tidak bisa diganti setelah dibuat.</span>
          </label>
          <label className={labelClass}>Nama
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nama admin" className={inputClass} />
          </label>
          <label className={labelClass}>Password awal
            <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" autoComplete="new-password" placeholder="Minimal 8 karakter" className={inputClass} />
            <span className={hintClass}>Sampaikan password ini ke admin yang bersangkutan; ia dapat diganti Pemilik kapan saja dari daftar di samping.</span>
          </label>
          <label className={labelClass}>Peran
            <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className={inputClass}>
              {ADMIN_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
            </select>
            <span className={hintClass}>{ROLE_DESCRIPTIONS[role]}</span>
          </label>
          <button type="submit" disabled={creating} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-50">
            {creating ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Buat akun admin
          </button>
        </form>

        <div className="grid content-start gap-3">
          <h3 className="inline-flex items-center gap-2 text-xs font-extrabold text-[#344638]"><ShieldCheck size={14} /> Daftar admin</h3>
          {notice && <p role="status" className="rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs font-semibold text-[#436444]">{notice}</p>}
          {error && <p role="alert" className="rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}
          {loading ? (
            <div className="grid gap-3">{[0, 1].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[#f1f4ef]" />)}</div>
          ) : loadError ? (
            <p role="alert" className="rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{loadError}</p>
          ) : admins.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#d8e0d4] bg-[#fbfcfa] px-4 py-6 text-center text-xs font-medium text-[#7c8579]">Belum ada admin tambahan. Admin utama tetap masuk dengan username <strong>admin</strong>.</p>
          ) : (
            <ul className="grid gap-3">
              {admins.map((admin) => (
                <li key={admin.id} className="rounded-2xl border border-[#e5eae3] bg-[#fbfcfa] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[#2b3b2d]">{admin.name} <span className="font-bold text-[#929a91]">@{admin.username}</span></p>
                      <p className="mt-1 text-[10px] font-medium text-[#959c93]">Dibuat {formatDate(admin.createdAt)}{admin.createdBy ? ` oleh ${admin.createdBy}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Badge tone="sage">{ROLE_LABELS[admin.role]}</Badge>
                      <Badge tone={admin.active ? "cream" : "dark"}>{admin.active ? "Aktif" : "Nonaktif"}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${admin.id}`}>Peran {admin.username}</label>
                    <select
                      id={`role-${admin.id}`}
                      value={admin.role}
                      disabled={busyId === admin.id}
                      onChange={(e) => void patchAdmin(admin.id, { role: e.target.value }, "Peran gagal diubah.")}
                      className="min-h-10 rounded-xl border border-[#e2e8e0] bg-white px-3 text-xs font-bold text-[#2b3b2d] outline-none focus:border-[#9db99b] disabled:opacity-60"
                    >
                      {ADMIN_ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
                    </select>
                    <button type="button" disabled={busyId === admin.id} onClick={() => void patchAdmin(admin.id, { active: !admin.active }, "Status gagal diubah.")} className="inline-flex min-h-10 items-center rounded-xl border border-[#e2e7e0] bg-white px-3 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                      {admin.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button type="button" disabled={busyId === admin.id} onClick={() => { setPasswordFor(passwordFor === admin.id ? "" : admin.id); setNewPassword(""); setError(""); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#e2e7e0] bg-white px-3 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50">
                      <KeyRound size={13} /> Password baru
                    </button>
                    <button type="button" disabled={busyId === admin.id} onClick={() => void handleDelete(admin)} aria-label={`Hapus admin ${admin.username}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#eedbd3] bg-white px-3 text-xs font-bold text-[#995744] transition hover:bg-[#fbf1ed] disabled:opacity-50">
                      <Trash2 size={13} /> Hapus
                    </button>
                    {busyId === admin.id && <Loader2 size={14} className="animate-spin text-[#7c8579]" />}
                  </div>
                  {passwordFor === admin.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`pw-${admin.id}`}>Password baru untuk {admin.username}</label>
                      <input id={`pw-${admin.id}`} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password baru (min. 8 karakter)" className="min-h-10 min-w-56 flex-1 rounded-xl border border-[#e2e8e0] bg-white px-3 text-sm font-medium text-[#2b3b2d] outline-none focus:border-[#9db99b]" />
                      <button type="button" disabled={busyId === admin.id} onClick={() => void handleResetPassword(admin)} className="inline-flex min-h-10 items-center rounded-xl bg-[#294b34] px-3 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-50">Simpan password</button>
                    </div>
                  )}
                  <p className={hintClass + " mt-2"}>Mengubah peran, status, atau password otomatis mengakhiri sesi admin tersebut di semua perangkat.</p>
                </li>
              ))}
            </ul>
          )}
          <p className={hintClass}>Admin utama (username <strong>admin</strong>, password dari server) tidak tercantum di sini, tidak bisa dihapus atau dinonaktifkan, dan selalu memiliki akses penuh sebagai cadangan.</p>
        </div>
      </div>
    </section>
  );
}
