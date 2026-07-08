import { IMAGES } from "@/lib/images";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://getmyguide.in"
).replace(/\/$/, "");

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const SITE_NAME = "GetMyGuide";

export const DEFAULT_TITLE = "GetMyGuide — Certified Local Guides & Authentic Tours in India";

export const DEFAULT_DESCRIPTION =
  "Connect with certified local guides for authentic eco tours, heritage walks, cooking classes, and cultural experiences across India. Book verified guides, curated tour packages, and unforgettable trips.";

export const DEFAULT_KEYWORDS = [
  "local tour guides India",
  "certified tour guides",
  "heritage walks",
  "eco tours",
  "cultural experiences",
  "book a local guide",
  "tour packages India",
  "GetMyGuide",
];

// Cloudinary supports on-the-fly transforms via URL segments, so we can
// derive favicon/apple-touch/manifest icon sizes from the one logo asset
// in lib/images.ts without adding new binary files to the repo.
export function cloudinaryResize(url: string, transform: string): string {
  return url.replace("/image/upload/", `/image/upload/${transform}/`);
}

export const DEFAULT_OG_IMAGE = {
  url: cloudinaryResize(IMAGES.logo, "w_1200,h_630,c_pad,b_white"),
  width: 1200,
  height: 630,
  alt: SITE_NAME,
};

export const TWITTER_HANDLE = "@getmyguide";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
