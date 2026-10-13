"use client";

import { useEffect, useState } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import {
  detectPlace,
  describePlace,
  forgetLocation,
  isCoarseAccuracy,
  LOCATION_MESSAGES,
  readBrowserPermission,
  readLocationState,
  saveGrantedPlace,
  saveLocationDenied,
  successMessageFor,
  type DetectedPlace,
} from "@/lib/location";
import { useHydrated, useLocationState } from "@/lib/use-location";

type LocationRequestResult = { tone: "ok" | "error"; message: string };

function useLocationRequest(onPlace?: (place: DetectedPlace) => void) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<LocationRequestResult | null>(null);

  async function request() {
    setBusy(true);
    setFeedback(null);
    const result = await detectPlace();
    setBusy(false);
    if (result.ok) {
      saveGrantedPlace(result.place);
      onPlace?.(result.place);
      setFeedback({ tone: "ok", message: successMessageFor(result.place) });
      return;
    }
    if (result.reason === "denied") saveLocationDenied();
    setFeedback({ tone: "error", message: result.message });
  }

  return { busy, feedback, request, setFeedback };
}

function LocationFeedback({ feedback }: { feedback: LocationRequestResult | null }) {
  if (!feedback) return null;
  const tone = feedback.tone === "ok" ? "bg-[#eef5eb] text-[#426641]" : "bg-[#fbefeb] text-[#9b513f]";
  return (
    <p role={feedback.tone === "ok" ? "status" : "alert"} aria-live="polite" className={`basis-full rounded-lg px-3 py-2 text-[11px] font-semibold leading-5 ${tone}`}>
      {feedback.message}
    </p>
  );
}

export function UseMyLocationButton({
  onPlace,
  onForget,
  label = "Gunakan lokasi saya",
  className = "",
}: {
  onPlace?: (place: DetectedPlace) => void;
  onForget?: () => void;
  label?: string;
  className?: string;
}) {
  const { consent, place } = useLocationState();
  const { busy, feedback, request } = useLocationRequest(onPlace);
  const active = consent === "granted" && place;

  function forget() {
    forgetLocation();
    onForget?.();
  }

  if (active) {
    return (
      <div className={`flex flex-wrap items-center gap-2 text-[11px] ${className}`}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf2e8] px-3 py-1.5 font-bold text-[#3d6142]">
          <MapPin size={13} />
          {describePlace(place)}
          {isCoarseAccuracy(place) ? " · perkiraan" : ""}
        </span>
        <button type="button" onClick={() => void request()} disabled={busy} className="min-h-8 rounded-lg px-2.5 font-bold text-[#4f6b4f] underline-offset-2 transition hover:bg-[#eef3eb] hover:underline disabled:opacity-50">
          {busy ? "Memperbarui…" : "Perbarui"}
        </button>
        <button type="button" onClick={forget} className="min-h-8 rounded-lg px-2.5 font-bold text-[#8b7a72] underline-offset-2 transition hover:bg-[#f7f2ef] hover:underline">
          Lupakan
        </button>
        <LocationFeedback feedback={feedback} />
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void request()}
        disabled={busy}
        className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#d9e3d5] bg-white px-3.5 text-xs font-bold text-[#3f6144] transition hover:bg-[#f2f7ef] disabled:opacity-60"
      >
        <MapPin size={14} />
        {busy ? "Mendeteksi lokasi…" : label}
      </button>
      <LocationFeedback feedback={feedback} />
    </div>
  );
}

export function LocationConsentBanner() {
  const { consent } = useLocationState();
  const hydrated = useHydrated();
  const { busy, feedback, request } = useLocationRequest();
  const [dismissed, setDismissed] = useState(false);

  if (!hydrated || dismissed || consent !== null) return null;

  return (
    <section aria-labelledby="location-consent-title" className="rounded-[24px] border border-[#dde7d8] bg-[#f3f8f0] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#3f6144]">
            <MapPin size={20} />
          </span>
          <div className="max-w-xl">
            <h2 id="location-consent-title" className="text-base font-extrabold text-[#2c3f30] sm:text-lg">Izinkan akses lokasi untuk isi form otomatis?</h2>
            <p className="mt-1.5 text-sm leading-6 text-[#5f6d60]">
              Dengan izinmu, kolom <strong className="font-bold">provinsi</strong> dan <strong className="font-bold">kota</strong> pada form pencarian, AI Umpan, Sistem Pakar, filter katalog, dan form ulasan langsung menyesuaikan lokasi mancingmu.
            </p>
            <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] leading-5 text-[#78877a]">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              Lokasi diproses di perangkat ini dan tidak dikirim ke server. Tanpa izin, form dibiarkan kosong dan tetap bisa diisi manual.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void request()}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#1f3c29] disabled:opacity-60"
          >
            {busy ? "Mendeteksi lokasi…" : "Izinkan lokasi"}
          </button>
          <button
            type="button"
            onClick={() => {
              saveLocationDenied();
              setDismissed(true);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8e0d3] bg-white px-5 text-sm font-bold text-[#5f6d60] transition hover:bg-[#f6f8f4]"
          >
            Nanti saja
          </button>
        </div>
      </div>
      {feedback && (
        <p
          role={feedback.tone === "ok" ? "status" : "alert"}
          aria-live="polite"
          className={`mt-4 rounded-xl px-3.5 py-2.5 text-xs font-semibold leading-5 ${feedback.tone === "ok" ? "bg-[#e4f0df] text-[#3c6140]" : "bg-[#fbefeb] text-[#9b513f]"}`}
        >
          {feedback.message}
        </p>
      )}
      {feedback?.tone === "error" && feedback.message === LOCATION_MESSAGES.denied && (
        <p className="mt-2 text-[11px] leading-5 text-[#78877a]">Kamu bisa mengaktifkan izin lokasi lewat pengaturan browser, lalu tekan tombol “Gunakan lokasi saya” di form.</p>
      )}
    </section>
  );
}

/**
 * Deteksi senyap saat izin browser sudah diberikan sebelumnya (mis. sebelum fitur
 * ini ada), agar form langsung menyesuaikan lokasi tanpa prompt ulang. Pilihan
 * "Nanti saja" dari pengguna tetap dihormati.
 */
export function LocationPermissionSync() {
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const snapshot = readLocationState();
      if (snapshot.consent === "denied") return;
      if (snapshot.consent === "granted" && snapshot.place) return;
      const permission = await readBrowserPermission();
      if (cancelled || permission !== "granted") return;
      const result = await detectPlace();
      if (!cancelled && result.ok) saveGrantedPlace(result.place);
    }
    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
