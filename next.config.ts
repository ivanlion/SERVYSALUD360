import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Optimizaciones de rendimiento */
  reactStrictMode: true,
  
  // Optimización de imágenes
  images: {
    formats: ['image/avif', 'image/webp'],
    // Optimización adicional de imágenes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Compresión (habilitada por defecto en Next.js 16)
  compress: true,
  
  // Optimización de producción
  productionBrowserSourceMaps: false, // Deshabilitar source maps en producción para mejor rendimiento
  
  // Transpilar módulos externos (incluyendo mcp-server)
  transpilePackages: ['@servysalud360/mcp-server'],
  
  // Optimización de bundle
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  
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
