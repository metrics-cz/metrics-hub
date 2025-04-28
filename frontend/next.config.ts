import path from 'path';

const nextConfig = {
  // ➜ vypneme lint při build-time
  eslint: { ignoreDuringBuilds: true },

  // ➜ statický export do `out`
  output: 'export',

  // alias @
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

export default nextConfig;
