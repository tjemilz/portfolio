/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/api/galleries/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        pathname: '/api/galleries/**',
      },
    ],
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
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@components/galleries'],
  },
};

export default nextConfig;
