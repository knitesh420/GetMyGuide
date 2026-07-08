import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/blogs",
        "/find-guides",
        "/tours",
        "/packages",
        "/services",
        "/about",
        "/contact",
      ],
      disallow: [
        "/dashboard",
        "/admin",
        "/login",
        "/signin",
        "/signup",
        "/verify-otp",
        "/forgot-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
