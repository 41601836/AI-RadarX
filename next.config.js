/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
    };
    return config;
  },

  // 构建优化
  compiler: {
    // 移除生产环境中的console.log
    removeConsole: {
      exclude: ['error', 'warn'],
    },
    // 优化React组件
    reactRemoveProperties: {
      properties: ['data-testid', 'data-test'],
    },
  },

  // 性能优化
  images: {
    // 启用图片优化
    formats: ['image/avif', 'image/webp'],
    // 图片源配置
    domains: [],
    // 图片加载优化
    minimumCacheTTL: 60,
  },



  // 缓存优化
  headers: async () => [
    {
      // 为所有静态资源设置缓存策略
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],

  // 代码分割优化
  productionBrowserSourceMaps: false,

  // 环境变量配置
  env: {
    // 可以在这里配置环境变量
    NEXT_PUBLIC_API_VERSION: 'v1',
  },

  // 跨域请求配置
  async rewrites() {
    return [
      // 排除AI推理API的重写规则
      {
        source: '/api/:path((?!ai-inference).*)',
        destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1/:path*',
      },
    ];
  },

  // 服务器端渲染优化
  serverRuntimeConfig: {
    // 服务器端的配置
    appName: 'AI Trading Terminal',
  },

  // 客户端配置
  publicRuntimeConfig: {
    // 客户端可以访问的配置
    apiVersion: 'v1',
  },
}

module.exports = nextConfig