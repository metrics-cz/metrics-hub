import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig = {
  // ➜ vypneme lint při build-time
/*   eslint: { ignoreDuringBuilds: true }, */

  // alias @
  webpack: (config: any) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  
  // Optimize framer-motion bundling
  experimental: {
    optimizePackageImports: ['framer-motion']
  },

  // CSP and security optimizations
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
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Production optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

// Wrap your existing nextConfig with the next-intl plugin
const withNextIntl = createNextIntlPlugin();

// Export the merged configuration
export default withNextIntl(nextConfig);