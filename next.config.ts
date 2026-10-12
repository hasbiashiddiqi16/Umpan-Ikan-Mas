import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mengizinkan host preview Arena saat menjalankan Next.js dalam mode development.
  allowedDevOrigins: ["*.e2b.app"],
  compress: true,
  poweredByHeader: false,
  images: {
    // Next/Image memilih format yang didukung browser dan melakukan resize sesuai `sizes`.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
