/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'still24.fr',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/media/**',
      },
    ],
    // Optimisations pour le lazy loading et la performance
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
    dangerouslyAllowSVG: false,
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
