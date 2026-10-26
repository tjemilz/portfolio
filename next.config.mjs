/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Redirections des anciennes URLs vers les nouvelles galeries
  async redirects() {
    return [
      {
        source: '/bw',
        destination: '/gallery/bw',
        permanent: true,
      },
      {
        source: '/streets',
        destination: '/gallery/streets',
        permanent: true,
      },
      {
        source: '/explore',
        destination: '/gallery/explore',
        permanent: true,
      },
      {
        source: '/private-galleries',
        destination: '/galleries',
        permanent: false, // Not permanent, might change
      },
    ];
  },
  // Proxy API requests to Django backend during local development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000'}/api/:path*`,
      },
    ];
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@components/galleries'],
  },
};

export default nextConfig;
