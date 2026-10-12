import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const sitemapUrl = absoluteUrl("/sitemap.xml");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api", "/dashboard"],
    },
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  };
}
