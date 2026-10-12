import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { RouteScrollReset } from "@/components/route-scroll-reset";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Browser lama mengabaikan token yang tidak dikenal, jadi aman disertakan.
  interactiveWidget: "resizes-content",
  themeColor: "#fbfcf9",
};

export const metadata: Metadata = {
  title: {
    default: "UMPAN MAS — Rekomendasi Umpan Ikan Mas Indonesia",
    template: "%s | UMPAN MAS",
  },
  description: "Temukan racikan umpan ikan mas berdasarkan lokasi, cuaca, kondisi air, dan pengalaman pemancing Indonesia.",
  applicationName: "UMPAN MAS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-[#fbfcf9] text-[#243328] antialiased"><RouteScrollReset /><AnalyticsTracker />{children}</body>
    </html>
  );
}
