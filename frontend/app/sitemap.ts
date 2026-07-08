import type { MetadataRoute } from "next";
import { API_URL, SITE_URL } from "@/lib/seo/config";

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/services", priority: 0.9, changeFrequency: "daily" },
  { path: "/find-guides", priority: 0.9, changeFrequency: "daily" },
  { path: "/guides", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blogs", priority: 0.8, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.6, changeFrequency: "monthly" },
  { path: "/register-guide", priority: 0.5, changeFrequency: "monthly" },
  { path: "/register-tourist", priority: 0.5, changeFrequency: "monthly" },
  { path: "/guide-availability", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund-and-cancellation", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms-and-conditions", priority: 0.3, changeFrequency: "yearly" },
  { path: "/safety-guidelines", priority: 0.3, changeFrequency: "yearly" },
];

async function safeFetchArray(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const body = await res.json();
    // Different endpoints in this backend shape their list responses
    // differently ({data:[...]} vs {blogs:[...]}) — try the known keys.
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.blogs)) return body.blogs;
    return [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogs, packages, guides] = await Promise.all([
    safeFetchArray(`${API_URL}/blog?limit=1000`),
    safeFetchArray(`${API_URL}/package`),
    safeFetchArray(`${API_URL}/guides/all?limit=1000`),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogs
    .filter((blog) => blog?.id)
    .map((blog) => ({
      url: `${SITE_URL}/blogs/${blog.id}`,
      lastModified: blog.updatedAt ? new Date(blog.updatedAt) : undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  const packageEntries: MetadataRoute.Sitemap = packages
    .filter((pkg) => pkg?._id)
    .map((pkg) => ({
      url: `${SITE_URL}/tours/${pkg._id}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const guideEntries: MetadataRoute.Sitemap = guides
    .filter((guide) => guide?._id)
    .map((guide) => ({
      url: `${SITE_URL}/find-guides/${guide._id}/book`,
      lastModified: guide.updatedAt ? new Date(guide.updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticEntries, ...blogEntries, ...packageEntries, ...guideEntries];
}
