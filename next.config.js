/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Add specific hostnames for your CDN, avatar providers, etc.
      // Example: { protocol: 'https', hostname: 'your-cdn.example.com' }
      // Example: { protocol: 'https', hostname: '*.supabase.co' }
      {
        protocol: 'https',
        hostname: 'euc.li', // ENS avatar service
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            // Allow framing by Warpcast for mini-app support
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://*.base.org https://*.coinbase.com wss://*.walletconnect.com https://*.walletconnect.com https://*.infura.io",
              // Allow Warpcast to frame this app
              "frame-ancestors 'self' https://*.warpcast.com https://warpcast.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Suppress warnings from optional peer dependencies in wallet SDKs
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;
