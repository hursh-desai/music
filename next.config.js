/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable webpack to handle ml5.js and other ML libraries
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;

