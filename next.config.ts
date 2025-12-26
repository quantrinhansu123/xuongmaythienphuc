import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tối ưu production build
  reactStrictMode: true,

  // Bật compression cho responses
  compress: true,

  // Ẩn header X-Powered-By để bảo mật và giảm size
  poweredByHeader: false,

  // Tối ưu logging cho production
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

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
    // Tối ưu package imports - thêm lucide-react và recharts
    optimizePackageImports: ['antd', '@ant-design/icons', '@tanstack/react-query', 'lucide-react', 'recharts', 'lodash'],
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
