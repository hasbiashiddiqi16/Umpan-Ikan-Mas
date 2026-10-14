import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const sitemapUrl = absoluteUrl("/sitemap.xml");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Area admin tidak ditawarkan ke mesin pencari; `/dashboard` juga dipagari
      // autentikasi di `src/proxy.ts` dan diberi `X-Robots-Tag: noindex`.
      disallow: ["/api", "/dashboard", "/login"],
    },
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  };
}
