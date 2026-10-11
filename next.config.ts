import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // One root layout per language (app/(ko), app/(en)) leaves no single layout
    // for unmatched addresses; app/global-not-found.tsx draws that 404 instead.
    globalNotFound: true,
  },
};

export default nextConfig;
