/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@frx/shield-sdk', '@frx/wallet-sdk', '@frx/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
