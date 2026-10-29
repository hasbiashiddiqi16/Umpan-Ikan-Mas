import type { Metadata } from "next";

import { HERO_ALT, LOGO_SRC } from "@/lib/brand";

export const SITE_NAME = "UMPAN MAS";
export const SITE_DESCRIPTION =
  "Temukan resep dan racikan umpan ikan mas berdasarkan lokasi, cuaca, kondisi air, dan pengalaman pemancing di Indonesia.";

function getConfiguredOrigin(): string | undefined {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (!candidate) return undefined;

  try {
    const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * Gunakan domain produksi yang dikonfigurasi eksplisit. Variabel host
 * deployment (Vercel) dipakai sebagai fallback; host lokal tidak pernah
 * dimasukkan ke canonical, sitemap, atau structured data.
 */
export const siteOrigin = getConfiguredOrigin();

export function absoluteUrl(path: string): string | undefined {
  if (!siteOrigin) return undefined;
  try {
    const safePath = path.startsWith("/") && !path.startsWith("//")
      ? path
      : `/${path.split("/").filter(Boolean).join("/")}`;
    const url = new URL(safePath, `${siteOrigin}/`);
    return url.origin === siteOrigin ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
  openGraphType?: "website" | "article";
  includeBrandInSocialTitle?: boolean;
};

/**
 * Metadata halaman publik: judul, deskripsi, canonical, dan preview berbagi.
 *
 * Halaman yang tidak menyebut `image` sendiri memakai endpoint media hero
 * (`/api/media/hero`) sebagai gambar pratinjau: endpoint itu menyajikan
 * banner hero terkini dari Dashboard Tampilan, atau berkas banner bawaan
 * bila belum ada unggahan. Dulu bawaannya berkas statis
 * `/images/pond-hero.jpg`, sehingga pratinjau berbagi selalu menampilkan
 * banner lama walau hero sudah diganti dari dashboard. Halaman yang
 * membutuhkan alamat berversi (beranda dan halaman publik utama) meneruskan
 * `hero.url` dari data tampilan secara eksplisit.
 */
export function createPageMetadata({
  title,
  description,
  path,
  image = "/api/media/hero",
  imageAlt = HERO_ALT,
  noIndex = false,
  openGraphType = "website",
  includeBrandInSocialTitle = true,
}: PageMetadataOptions): Metadata {
  const canonical = noIndex ? undefined : absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  const socialTitle = includeBrandInSocialTitle ? `${title} | ${SITE_NAME}` : title;

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: openGraphType,
      locale: "id_ID",
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(imageUrl ? { images: [{ url: imageUrl, alt: imageAlt }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: socialTitle,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function getSiteStructuredData(): Record<string, unknown> | undefined {
  if (!siteOrigin) return undefined;

  const organizationId = `${siteOrigin}/#organization`;
  // Logo absolut membantu Google menampilkan identitas merek di hasil pencarian.
  const logoUrl = absoluteUrl(LOGO_SRC);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url: siteOrigin,
        description: SITE_DESCRIPTION,
        ...(logoUrl ? { logo: logoUrl, image: logoUrl } : {}),
        areaServed: { "@type": "Country", name: "Indonesia" },
        knowsAbout: [
          "Umpan ikan mas",
          "Resep umpan ikan mas",
          "Memancing ikan mas",
          "Kondisi kolam dan cuaca",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteOrigin}/#website`,
        url: siteOrigin,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "id-ID",
        publisher: { "@id": organizationId },
      },
    ],
  };
}
