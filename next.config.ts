import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mengizinkan host preview Arena saat menjalankan Next.js dalam mode development.
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
