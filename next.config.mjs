/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Remove appDir — it’s on by default
  experimental: {
    // keep other experimental options here if you have any (e.g. serverActions, etc.)
  },

  // ✅ Remove exportPathMap completely
  reactStrictMode: true,

  // (Optional) — helpful for dynamic imports
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": "./",
    };
    return config;
  },
};

export default nextConfig;