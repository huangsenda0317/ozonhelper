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
  eslint: {
    ignoreDuringBuilds: process.env.LOW_MEMORY_BUILD === '1',
  },
  experimental: {
    typedRoutes: false,
    optimizePackageImports: ['antd', '@ant-design/x', 'lucide-react', 'echarts'],
    // 低内存 ECS 构建：单线程编译 + webpack 独立 worker，降低峰值内存
    ...(process.env.LOW_MEMORY_BUILD === '1'
      ? { cpus: 1, workerThreads: false, webpackBuildWorker: true }
      : {}),
  },
  webpack: (config, { dev }) => {
    if (process.env.LOW_MEMORY_BUILD === '1' && !dev) {
      // 内存型 cache，构建结束后释放，避免持久 cache 撑爆小内存机器
      config.cache = { type: 'memory' };
    }
    return config;
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
