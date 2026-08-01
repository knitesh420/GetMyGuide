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
  // pdfkit reads its font-metric files (.afm) off disk at RUNTIME, resolved
  // relative to its own __dirname. Bundling it breaks that: the bundler
  // rewrites __dirname, the lookup resolves to a nonexistent root, and every
  // invoice PDF download 500s with
  //   ENOENT ... C:\ROOT\node_modules\...\pdfkit\js\data\Helvetica.afm
  //
  // Marking it external keeps it a plain runtime require from node_modules, so
  // __dirname stays real. outputFileTracingIncludes then makes sure the data
  // directory is actually shipped, because file-tracing follows `require`s and
  // cannot see a path built at runtime. Both halves are needed: external alone
  // fixes local `next start` but can still ship a bundle without the .afm
  // files; the trace include alone does not fix the rewritten __dirname.
  //
  // This ONLY manifests in a built app. Under Jest the same code reads from
  // real node_modules and passes, which is why 864 green tests never caught it
  // — it was found by running `next start` and downloading an invoice.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/invoice/**": ["./node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/data/**"],
  },
}

export default nextConfig
