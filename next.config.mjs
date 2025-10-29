/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // 🧠 Tell Next.js NOT to pre-render resume/editor
  experimental: { appDir: true },
  output: "standalone",
  // Avoid static export for that path
  async exportPathMap(defaultPathMap) {
    delete defaultPathMap["/resume/editor"];
    return defaultPathMap;
  },
};

export default nextConfig;