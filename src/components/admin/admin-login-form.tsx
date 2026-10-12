"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, MoveRight } from "lucide-react";

export function AdminLoginForm() {
  const passwordRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleTogglePassword() {
    const input = passwordRef.current;
    if (input) {
      const length = input.value.length;
      selectionRef.current = {
        start: input.selectionStart ?? length,
        end: input.selectionEnd ?? length,
      };
    }
    setShowPassword((visible) => !visible);
  }

  // Saat type input berubah (password <-> text), WebKit lama di iOS bisa
  // kehilangan fokus dan posisi kursor sehingga toggle terasa tidak
  // berfungsi. Kembalikan fokus + seleksi agar toggle langsung terasa di
  // perangkat apa pun dan keyboard tetap terbuka di ponsel.
  useEffect(() => {
    const input = passwordRef.current;
    const selection = selectionRef.current;
    selectionRef.current = null;
    if (!input || !selection) return;
    input.focus({ preventScroll: true });
    try {
      input.setSelectionRange(selection.start, selection.end);
    } catch {
      // Abaikan pada browser yang tidak mendukung setSelectionRange.
    }
  }, [showPassword]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Baca nilai langsung dari form agar tetap benar saat iOS meng-autofill
    // tanpa memicu onChange React.
    const submitted = new FormData(event.currentTarget).get("password");
    const value = typeof submitted === "string" ? submitted : "";
    if (!value) {
      setError("Masukkan password admin terlebih dahulu.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Login gagal. Periksa password dan coba lagi.");
        setIsSubmitting(false);
        return;
      }

      // Navigasi dokumen penuh (bukan client-side router) agar cookie sesi
      // yang baru saja dipasang pasti terbaca oleh server, termasuk pada
      // browser lama. Halaman login juga tidak tertinggal di riwayat.
      window.location.replace("/dashboard");
      // Pengaman: jika navigasi tidak terjadi (mis. koneksi terputus),
      // kembalikan tombol agar bisa dicoba lagi.
      window.setTimeout(() => setIsSubmitting(false), 5000);
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
          <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-4 top-0 flex items-center text-[#89958a]"><LockKeyhole size={17} /></span>
          <input
            ref={passwordRef}
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus
            enterKeyHint="go"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Masukkan password admin"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            className="h-[54px] w-full rounded-2xl border border-[#e1e7de] bg-[#fbfcfa] pl-11 pr-12 text-base text-[#27382b] outline-none transition placeholder:text-[#a2aaa0] focus:border-[#6b8c68] focus:bg-white"
          />
          {/* Tombol toggle tanpa transform (posisi murni inset/flex) dan area
              sentuh 48x54px agar tetap bisa diklik di browser lama & layar kecil. */}
          <button
            type="button"
            onClick={handleTogglePassword}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute bottom-0 right-0 top-0 flex w-12 items-center justify-center rounded-r-2xl text-[#8a968a] transition hover:bg-[#eef2eb] hover:text-[#46634a]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && <p id="login-error" role="alert" className="-mt-2 rounded-xl border border-[#f0d6d0] bg-[#fff7f5] px-3.5 py-3 text-sm text-[#a04739]">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="group inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#244632] px-5 text-base font-bold text-white shadow-[0_10px_22px_-12px_rgba(35,72,48,.75)] transition hover:bg-[#1b3827] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <><LoaderCircle size={17} className="animate-spin" /> Memverifikasi…</> : <>Masuk ke dashboard <MoveRight size={17} className="transition-transform group-hover:translate-x-1" /></>}
      </button>
      <p className="-mt-1 text-center text-[11px] leading-5 text-[#98a196]">Sesi login akan berakhir otomatis setelah 8 jam.</p>
    </form>
  );
}
