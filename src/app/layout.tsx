import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { JsonLd } from "@/components/json-ld";
import { LocationPermissionSync } from "@/components/location-controls";
import { PromoModal } from "@/components/promo-modal";
import { RouteScrollReset } from "@/components/route-scroll-reset";
import { readAppearance } from "@/lib/appearance-server";
import { HERO_ALT } from "@/lib/brand";
import { absoluteUrl, getSiteStructuredData, SITE_DESCRIPTION, SITE_NAME, siteOrigin } from "@/lib/seo";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Browser lama mengabaikan token yang tidak dikenal, jadi aman disertakan.
  interactiveWidget: "resizes-content",
  themeColor: "#fbfcf9",
};

/**
 * Metadata bawaan seluruh situs. Gambar pratinjau berbaginya dinamis:
 * mengikuti banner hero yang diatur dari Dashboard Tampilan (alamatnya
 * berversi setiap diganti), bukan lagi berkas banner statis di repo.
 * Halaman yang punya gambar sendiri (mis. detail resep) tetap memakai
 * gambarnya karena metadata halaman menimpa bawaan ini.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await readAppearance();
  const homeUrl = absoluteUrl("/");
  const homeImageUrl = absoluteUrl(hero.url);

  return {
    ...(siteOrigin ? { metadataBase: new URL(`${siteOrigin}/`) } : {}),
    title: {
      default: "Resep Umpan Ikan Mas Indonesia | UMPAN MAS",
      template: "%s | UMPAN MAS",
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "sports",
    formatDetection: { email: false, address: false, telephone: false },
    ...(homeUrl || homeImageUrl
      ? {
          openGraph: {
            type: "website",
            locale: "id_ID",
            siteName: SITE_NAME,
            title: "Resep Umpan Ikan Mas Indonesia | UMPAN MAS",
            description: SITE_DESCRIPTION,
            ...(homeUrl ? { url: homeUrl } : {}),
            ...(homeImageUrl
              ? { images: [{ url: homeImageUrl, alt: HERO_ALT }] }
              : {}),
          },
          twitter: {
            card: homeImageUrl ? "summary_large_image" : "summary",
            title: "Resep Umpan Ikan Mas Indonesia | UMPAN MAS",
            description: SITE_DESCRIPTION,
            ...(homeImageUrl ? { images: [homeImageUrl] } : {}),
          },
        }
      : {}),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const siteStructuredData = getSiteStructuredData();

  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body className="bg-[#fbfcf9] text-[#243328] antialiased">
        {siteStructuredData && <JsonLd data={siteStructuredData} />}
        <RouteScrollReset />
        <AnalyticsTracker />
        <LocationPermissionSync />
        <PromoModal />
        {children}
      </body>
    </html>
  );
}
