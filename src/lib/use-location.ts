"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  getLocationSnapshot,
  getServerLocationSnapshot,
  subscribeLocation,
  type DetectedPlace,
  type LocationState,
} from "@/lib/location";

export function useLocationState(): LocationState {
  return useSyncExternalStore(subscribeLocation, getLocationSnapshot, getServerLocationSnapshot);
}

/**
 * True hanya setelah hidrasi di klien; dipakai untuk menahan elemen yang
 * bergantung pada localStorage agar tidak berkedip atau berbeda dengan server.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

function subscribeNoop(): () => void {
  return () => undefined;
}

/**
 * Mengisi field lokasi otomatis dari hasil deteksi selama pengguna belum
 * mengubahnya sendiri. Panggil `markTouched()` pada onChange field lokasi agar
 * pilihan manual tidak ditimpa deteksi.
 */
export function useLocationAutofill(apply: (place: DetectedPlace) => void) {
  const { consent, place } = useLocationState();
  const touched = useRef(false);
  const appliedKey = useRef("");

  useEffect(() => {
    if (!place || touched.current) return;
    const key = `${place.latitude},${place.longitude},${place.province}`;
    if (appliedKey.current === key) return;
    appliedKey.current = key;
    apply(place);
  }, [apply, place]);

  const markTouched = useCallback(() => {
    touched.current = true;
  }, []);

  return { consent, place, markTouched };
}
