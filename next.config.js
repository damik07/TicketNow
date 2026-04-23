/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/auth/callback',
        destination: '/api/auth/callback',
      },
    ];
  },
};

export default nextConfig;
