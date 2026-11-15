// Static export so the app can be hosted on GitHub Pages.
// NEXT_PUBLIC_BASE_PATH is "/<repo-name>" on GitHub Pages and empty locally.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
