/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    // Keep the app self-contained: the workspace has its own lockfile one level up.
    root: import.meta.dirname,
  },
}

export default nextConfig
