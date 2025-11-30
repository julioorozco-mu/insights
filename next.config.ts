import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.mux.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  reactStrictMode: true,
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Turbopack config vacío para Next.js 16 (usa Turbopack por defecto)
  turbopack: {
    resolveAlias: {
      // Alias para xlsx en el cliente
      'xlsx': 'xlsx/dist/xlsx.mini.min.js',
    },
  },
};

export default nextConfig;
