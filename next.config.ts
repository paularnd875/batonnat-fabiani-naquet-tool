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
    // Désactiver certains features problématiques en dev
    ...(process.env.NODE_ENV === 'development' ? {
      turbopack: {
        rules: {
          '*.tsx': {
            loaders: [{
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                    tsx: true,
                  },
                },
              },
            }],
          },
        },
      },
    } : {}),
  },
  // Compression
  compress: true,
  
  // Configuration React pour éviter les erreurs d'hydratation  
  reactStrictMode: false, // Temporairement désactivé pour éviter le double-rendering
  
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
