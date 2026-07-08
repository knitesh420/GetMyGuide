import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // The codebase typechecks clean (npx tsc --noEmit → 0 errors). Keep this
    // false so type regressions fail the build instead of shipping silently.
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      // Blog post images are served directly from the backend API (/media/blogs/...)
      { protocol: "https", hostname: "api.getmyguide.in" },
      { protocol: "http", hostname: "localhost", port: "8000" },
    ],
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
