import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performans optimizasyonları
  experimental: {
    optimizePackageImports: ["recharts", "sweetalert2"],
  },
  // Görsel optimizasyonu
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Powered by header'ı kaldır
  poweredByHeader: false,
};

export default nextConfig;
