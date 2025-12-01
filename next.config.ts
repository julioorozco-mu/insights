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
      {
        protocol: "https",
        hostname: "lhuqciwwklwbpkvxuvxs.supabase.co",
      },
    ],
  },
  reactStrictMode: true,
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Turbopack config para Next.js 16
  turbopack: {
    resolveAlias: {
      // Alias para xlsx en el cliente
      'xlsx': 'xlsx/dist/xlsx.mini.min.js',
      // Alias para Firebase (migración a Supabase)
      'firebase/firestore': './src/lib/firestore-compat.ts',
      'firebase/auth': './src/lib/firebase.ts',
      'firebase/storage': './src/lib/firebase.ts',
      'firebase-admin': './src/lib/firebase-admin-compat.ts',
      'firebase-admin/auth': './src/lib/firebase-admin-compat.ts',
      'firebase-admin/firestore': './src/lib/firebase-admin-compat.ts',
      'firebase-admin/app': './src/lib/firebase-admin-compat.ts',
    },
  },
};

export default nextConfig;
