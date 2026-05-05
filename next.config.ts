import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Autoriser les images de tous domaines pour les photos d'avocats
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Optimisations d'images
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24h
  },
  // Optimisations de compilation
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Compression
  compress: true,
  
  // Configuration React pour éviter les erreurs d'hydratation
  reactStrictMode: true,
  
  // Headers personnalisés pour la performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
