import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [{
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '',
        search: '',
      }],
  },
};

export default nextConfig;
