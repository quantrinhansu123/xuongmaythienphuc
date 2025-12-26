import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tối ưu production build
  reactStrictMode: true,
  
  // Tối ưu images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24 giờ
  },

  // Tối ưu compiler
  compiler: {
    // Loại bỏ console.log trong production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Tối ưu experimental features
  experimental: {
    // Tối ưu package imports
    optimizePackageImports: ['antd', '@ant-design/icons', '@tanstack/react-query'],
  },

  // Headers cho caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
