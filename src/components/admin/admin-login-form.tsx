"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, MoveRight } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Login gagal. Periksa password dan coba lagi.");
        setIsSubmitting(false);
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div>
        <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-[#354539]">Password admin</label>
        <div className="relative">
          <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#89958a]" />
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Masukkan password admin"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            className="h-[54px] w-full rounded-2xl border border-[#e1e7de] bg-[#fbfcfa] pl-11 pr-12 text-sm text-[#27382b] outline-none transition placeholder:text-[#a2aaa0] focus:border-[#6b8c68] focus:bg-white focus:ring-4 focus:ring-[#6b8c68]/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-[#8a968a] transition hover:bg-[#eef2eb] hover:text-[#46634a]"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {error && <p id="login-error" role="alert" className="-mt-2 rounded-xl border border-[#f0d6d0] bg-[#fff7f5] px-3.5 py-3 text-sm text-[#a04739]">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || !password}
        className="group inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#244632] px-5 text-sm font-bold text-white shadow-[0_10px_22px_-12px_rgba(35,72,48,.75)] transition hover:bg-[#1b3827] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <><LoaderCircle size={17} className="animate-spin" /> Memverifikasi…</> : <>Masuk ke dashboard <MoveRight size={17} className="transition-transform group-hover:translate-x-1" /></>}
      </button>
      <p className="-mt-1 text-center text-[11px] leading-5 text-[#98a196]">Sesi login akan berakhir otomatis setelah 8 jam.</p>
    </form>
  );
}
