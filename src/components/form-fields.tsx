import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Kelas bersama untuk semua dropdown (<select>) di halaman publik.
 *
 * Kenapa tidak mengandalkan tampilan bawaan peramban:
 * - Di iOS Safari (termasuk iPhone 7), `min-height` pada `<select>` diabaikan,
 *   jadi field-nya pendek — teks nyaris menempel ke tepi atas dan bawah. Karena
 *   itu tinggi di sini ditentukan oleh padding (`py-3`), bukan hanya min-height.
 * - Panah bawaan peramban menempel ke tepi dan tidak bisa diberi jarak. Panah
 *   digambar sendiri oleh `SelectBox`, dengan jarak tetap dari tepi kanan dan
 *   ruang kosong di sebelah kirinya (`pr-11`) supaya tidak menempel ke teks.
 */
export const SELECT_FIELD_CLASS = "select-field py-3 pr-11 sm:py-2.5";

/**
 * Pembungkus dropdown publik: menaruh ikon panah sendiri di dalam field,
 * dengan jarak dari tepi kanan (`right-3.5` = 14px) dan dari teks (`pr-11`).
 * Teks tetap diberi jarak dari tepi kiri lewat `pl-3.5` pada kelas field-nya.
 */
export function SelectBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative block min-w-0 ${className}`}>
      {children}
      <ChevronDown
        aria-hidden="true"
        data-select-arrow=""
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#626d63] (4.63:1 terburuk)"
      />
    </span>
  );
}
