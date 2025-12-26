import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Optimizaciones de rendimiento */
  reactStrictMode: true,
  
  // Optimización de imágenes
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Compresión (habilitada por defecto en Next.js 16)
  compress: true,
  
  // Headers de seguridad y rendimiento
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
