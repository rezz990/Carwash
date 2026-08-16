import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Konfigurasi images jika diperlukan
  images: {
    unoptimized: true, // Jika menggunakan LiteSpeed/Apache
  },
  
  // Experimental features
  experimental: {
    // Enable jika menggunakan React 19 features
  },
  
  // Headers untuk security dan error handling
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;