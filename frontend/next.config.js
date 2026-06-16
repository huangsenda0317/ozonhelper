/** @type {import('next').NextConfig} */

// 本地开发：将 /api/* 代理到 FastAPI；生产环境由 Nginx 反代，此项不生效也无妨
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000';

const nextConfig = {
  images: {
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
  },
  experimental: {
    typedRoutes: false,
    // 低内存 ECS 构建：单线程编译，降低峰值内存
    ...(process.env.LOW_MEMORY_BUILD === '1' ? { cpus: 1, workerThreads: false } : {}),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
