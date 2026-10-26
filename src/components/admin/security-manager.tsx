"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, RotateCcw, ShieldCheck, ShieldQuestion, TriangleAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminsManager } from "@/components/admin/admins-manager";
import { Badge } from "@/components/shared";
import {
  ADMIN_PASSWORD_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_PASSWORD_RULES,
  validatePasswordChange,
} from "@/lib/admin-password";

type PasswordState = {
  generation: number;
  custom: boolean;
  updatedAt: string | null;
  readable: boolean;
  envConfigured: boolean;
  minLength: number;
  maxLength: number;
};

const labelClass = "grid gap-1.5 text-xs font-bold text-[#616c60] (4.71:1 terburuk)";
const inputClass = "min-h-11 w-full rounded-xl border border-[#e2e8e0] bg-white px-3.5 text-sm font-medium text-[#2b3b2d] outline-none transition focus:border-[#9db99b] focus:ring-2 focus:ring-[#dcebd8] disabled:opacity-60";
const hintClass = "text-[10px] font-medium leading-4 text-[#959c93]";

/** Permintaan keadaan password; dipakai saat halaman dibuka dan saat "Coba lagi". */
function fetchPasswordState() {
  return fetch("/api/admin/password", { cache: "no-store" })
    .then(async (response) => ({ ok: response.ok, data: await response.json() as PasswordState & { error?: string } }));
}

const formatDate = (value: string | null) => (value
  ? new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "belum pernah");

export function SecurityManager() {
  const [state, setState] = useState<PasswordState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"simpan" | "reset" | "">("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  // `loading` sudah bernilai true sejak awal; perubahan state hanya terjadi di
  // dalam callback permintaan jaringan, bukan langsung di badan effect.
  useEffect(() => {
    let active = true;
    fetchPasswordState()
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) { setLoadError(data.error ?? "Keadaan password gagal dimuat."); return; }
        setState(data);
      })
      .catch(() => { if (active) setLoadError("Keadaan password gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  /** Dimuat ulang dari tombol "Coba lagi" (bukan dari effect). */
  function retryLoad() {
    setLoading(true); setLoadError("");
    fetchPasswordState()
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error ?? "Keadaan password gagal dimuat.");
        setState(data);
      })
      .catch((caught) => setLoadError(caught instanceof Error ? caught.message : "Keadaan password gagal dimuat."))
      .finally(() => setLoading(false));
  }

  function clearForm() {
    setCurrent(""); setNext(""); setConfirm("");
  }

  async function savePassword() {
    setNotice(""); setError("");

    // Diperiksa dulu di sini supaya salah ketik ketahuan tanpa menunggu server.
    const parsed = validatePasswordChange({ current, next, confirm });
    if (!parsed.data) {
      setError(parsed.error ?? "Isian ganti password belum lengkap.");
      return;
    }

    setBusy("simpan");
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json() as { notice?: string; error?: string; state?: PasswordState };
      if (!response.ok) throw new Error(data.error ?? "Password baru gagal disimpan.");
      if (data.state) setState(data.state);
      setNotice(data.notice ?? "Password dashboard diperbarui.");
      clearForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password baru gagal disimpan.");
    } finally {
      setBusy("");
    }
  }

  async function resetToEnv() {
    if (!window.confirm("Kembalikan password dashboard ke ADMIN_PASSWORD dari server? Password yang Anda pasang di sini akan dihapus.")) return;
    setBusy("reset"); setNotice(""); setError("");
    try {
      const response = await fetch("/api/admin/password", { method: "DELETE" });
      const data = await response.json() as { notice?: string; error?: string; state?: PasswordState };
      if (!response.ok) throw new Error(data.error ?? "Password bawaan gagal dipakai kembali.");
      if (data.state) setState(data.state);
      setNotice(data.notice ?? "Password dashboard kembali memakai ADMIN_PASSWORD dari server.");
      clearForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password bawaan gagal dipakai kembali.");
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="grid gap-3">
          {[0, 1].map((item) => <div key={item} className="h-44 animate-pulse rounded-[20px] bg-[#f1f4ef]" />)}
        </div>
      </AdminShell>
    );
  }

  const custom = state?.custom ?? false;
  const readable = state?.readable ?? false;
  const envConfigured = state?.envConfigured ?? true;
  const minLength = state?.minLength ?? ADMIN_PASSWORD_MIN_LENGTH;
  const maxLength = state?.maxLength ?? ADMIN_PASSWORD_MAX_LENGTH;
  const kosong = !current && !next && !confirm;

  return (
    <AdminShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#656d64] (4.59:1 terburuk)">
            <Link href="/dashboard" className="hover:text-[#3f6044]">Studio</Link><span>/</span><span>Keamanan</span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.045em] text-[#25372a] sm:text-4xl">Keamanan</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#626c62] (4.69:1 terburuk)">Ganti password untuk masuk ke dashboard ini. Password situs publik (pengunjung) tidak terpengaruh.</p>
        </div>
        <Link href="/" target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#294b34] px-4 text-xs font-extrabold text-white transition hover:bg-[#203d29] sm:self-auto">
          Lihat situs publik
        </Link>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-[#dbe8d7] bg-[#f0f6ed] px-4 py-3 text-xs font-semibold text-[#436444]">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}
      {loadError && (
        <p role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">
          {loadError}
          <button type="button" onClick={retryLoad} className="rounded-lg border border-[#e2b9aa] bg-white px-3 py-1.5 text-[11px] font-bold text-[#8c4c3a]">Coba lagi</button>
        </p>
      )}

      <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold text-[#344638]">Password dashboard</h2>
            <p className="mt-1 text-[10px] text-[#929a91]">Dipakai di halaman masuk <code>/login</code> dan seluruh menu Content Studio.</p>
          </div>
          <Badge tone={custom ? "sage" : "cream"}>{custom ? "Password sendiri" : "Password bawaan server"}</Badge>
        </header>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid content-start gap-4">
            {!readable && (
              <p className="flex items-start gap-2 rounded-2xl border border-[#f0e2c8] bg-[#fdf8ee] px-4 py-3 text-[11px] font-semibold text-[#846632] (4.59:1 terburuk)">
                <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                Basis data belum tersambung, jadi password baru belum bisa disimpan. Sementara ini yang berlaku adalah ADMIN_PASSWORD dari server.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Password saat ini
                <input
                  type={showPasswords ? "text" : "password"}
                  value={current}
                  autoComplete="current-password"
                  disabled={busy !== "" || !readable}
                  onChange={(event) => setCurrent(event.target.value)}
                  className={inputClass}
                  placeholder="Password yang dipakai sekarang"
                />
              </label>
              <div className="flex items-end">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-[#616c60] (4.71:1 terburuk)">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(event) => setShowPasswords(event.target.checked)}
                    className="h-4 w-4 rounded border-[#cfd8cd] accent-[#315a39]"
                  />
                  Tampilkan password
                </label>
              </div>
              <label className={labelClass}>
                Password baru
                <input
                  type={showPasswords ? "text" : "password"}
                  value={next}
                  autoComplete="new-password"
                  disabled={busy !== "" || !readable}
                  onChange={(event) => setNext(event.target.value)}
                  className={inputClass}
                  placeholder={`Minimal ${minLength} karakter`}
                />
              </label>
              <label className={labelClass}>
                Ulangi password baru
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirm}
                  autoComplete="new-password"
                  disabled={busy !== "" || !readable}
                  onChange={(event) => setConfirm(event.target.value)}
                  className={inputClass}
                  placeholder="Ketik ulang password baru"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void savePassword()}
                disabled={busy !== "" || !readable || kosong}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-5 text-xs font-extrabold text-white transition hover:bg-[#203d29] disabled:opacity-60"
              >
                {busy === "simpan" ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Simpan password baru
              </button>
              <button
                type="button"
                onClick={clearForm}
                disabled={busy !== "" || kosong}
                className="inline-flex min-h-11 items-center rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50"
              >
                Kosongkan isian
              </button>
            </div>

            <p className={hintClass}>
              Panjang {minLength}–{maxLength} karakter. Setelah tersimpan, sesi login di perangkat lain otomatis berakhir, sedangkan perangkat ini tetap masuk.
            </p>
          </div>

          <aside className="grid content-start gap-3 rounded-2xl border border-[#e8ece5] bg-[#fbfcfa] p-4">
            <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#666d65] (4.57:1 terburuk)">
              <ShieldCheck size={14} className="text-[#4d7351] (4.64:1 terburuk)" /> Status
            </p>
            <dl className="grid gap-2 text-[11px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-semibold text-[#666d65] (4.57:1 terburuk)">Sumber password</dt>
                <dd className="text-right font-bold text-[#3c5140]">{custom ? "Dipasang di dashboard" : "ADMIN_PASSWORD server"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-semibold text-[#666d65] (4.57:1 terburuk)">Terakhir diubah</dt>
                <dd className="text-right font-bold text-[#3c5140]">{formatDate(state?.updatedAt ?? null)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-semibold text-[#666d65] (4.57:1 terburuk)">Versi keamanan</dt>
                <dd className="text-right font-bold text-[#3c5140]">ke-{state?.generation ?? 0}</dd>
              </div>
            </dl>
            <ul className="grid gap-1.5 border-t border-[#eef0ec] pt-3 text-[10px] font-medium leading-4 text-[#666d65] (4.57:1 terburuk)">
              {ADMIN_PASSWORD_RULES.map((rule) => <li key={rule}>• {rule}</li>)}
            </ul>
            <p className={hintClass}>Password disimpan dalam bentuk teracak (scrypt), bukan teks asli — termasuk untuk Anda.</p>
          </aside>
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-[20px] border border-[#e5eae3] bg-white shadow-[0_5px_20px_rgba(36,53,39,.03)]">
        <header className="border-b border-[#eef0ec] px-4 py-4 sm:px-5">
          <h2 className="text-sm font-extrabold text-[#344638]">Kembalikan ke password bawaan</h2>
          <p className="mt-1 text-[10px] text-[#929a91]">Hapus password yang dipasang di dashboard, lalu pakai kembali nilai <code>ADMIN_PASSWORD</code> pada environment server.</p>
        </header>
        <div className="grid gap-3 p-4 sm:p-5">
          {!envConfigured && (
            <p className="flex items-start gap-2 rounded-2xl border border-[#f0e2c8] bg-[#fdf8ee] px-4 py-3 text-[11px] font-semibold text-[#846632] (4.59:1 terburuk)">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" />
              <code>ADMIN_PASSWORD</code> belum diatur di server. Isi dulu di environment sebelum kembali ke password bawaan, supaya Anda tidak terkunci di luar dashboard.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void resetToEnv()}
              disabled={busy !== "" || !readable || !custom}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e7e0] bg-white px-4 text-xs font-bold text-[#636e63] (4.57:1 terburuk) transition hover:bg-[#f6f8f5] disabled:opacity-50"
            >
              {busy === "reset" ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Pakai password server lagi
            </button>
            <p className={hintClass}>
              {custom
                ? "Tombol ini hanya mengubah caranya masuk dashboard. Konten, ulasan, dan pengaturan situs tidak terhapus."
                : "Belum ada password yang dipasang di dashboard, jadi saat ini sudah memakai password bawaan server."}
            </p>
          </div>
        </div>
      </section>

      <AdminsManager />

      <section className="mb-2 grid gap-3 rounded-[20px] border border-[#e5eae3] bg-[#fbfcfa] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-[#344638]"><ShieldQuestion size={16} className="text-[#4d7351] (4.64:1 terburuk)" /> Kalau lupa password</h2>
          <ol className="mt-2 grid gap-1.5 text-[11px] font-medium leading-5 text-[#626c62] (4.69:1 terburuk)">
            <li>1. Ganti nilai <code>ADMIN_PASSWORD</code> di environment host (mis. Vercel → Settings → Environment Variables), lalu deploy ulang.</li>
            <li>2. Masuk kembali ke dashboard dengan nilai baru itu, lalu pasang password pilihan Anda di halaman ini.</li>
          </ol>
        </div>
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-[#344638]"><ShieldCheck size={16} className="text-[#4d7351] (4.64:1 terburuk)" /> Catatan</h2>
          <ul className="mt-2 grid gap-1.5 text-[11px] font-medium leading-5 text-[#626c62] (4.69:1 terburuk)">
            <li>• <code>ADMIN_PASSWORD</code> jangan dihapus dari server: ia jadi kunci cadangan sekaligus penanda tangan sesi (bila <code>ADMIN_SESSION_SECRET</code> kosong).</li>
            <li>• Halaman ini tidak mengubah apa pun yang dilihat pengunjung situs.</li>
          </ul>
        </div>
      </section>
    </AdminShell>
  );
}
