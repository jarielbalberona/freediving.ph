import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '**',
        search: '',
      },
      {
        protocol: 'https',
        hostname: 'freediving-ph-api.onrender.com',
        port: '',
        pathname: '**',
        search: '',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        port: '',
        pathname: '**',
        search: '',
      }
    ],
  },
  // Render.com specific configuration
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
};

export default nextConfig;
