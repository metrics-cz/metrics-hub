import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig = {
  // ➜ vypneme lint při build-time
/*   eslint: { ignoreDuringBuilds: true }, */

  // alias @
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  
  // Optimize framer-motion bundling
  experimental: {
    optimizePackageImports: ['framer-motion']
  }
};

// Wrap your existing nextConfig with the next-intl plugin
const withNextIntl = createNextIntlPlugin();

// Export the merged configuration
export default withNextIntl(nextConfig);