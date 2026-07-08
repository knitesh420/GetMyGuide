import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { blogPostingSchema } from "@/lib/seo/jsonld";
import { API_URL, DEFAULT_OG_IMAGE } from "@/lib/seo/config";

interface BlogRecord {
  id: string;
  videoId: string;
  thumbnailUrl?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

async function getBlog(id: string): Promise<BlogRecord | null> {
  try {
    const res = await fetch(`${API_URL}/blog/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data ?? body) as BlogRecord;
  } catch {
    return null;
  }
}

// Blog posts have no title field, only a free-text description — derive a
// title from its leading sentence/clause instead.
function deriveTitle(description: string): string {
  const clean = description.replace(/\s+/g, " ").trim();
  const cut = clean.slice(0, 70);
  return cut.length < clean.length ? `${cut.split(" ").slice(0, -1).join(" ")}…` : cut;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const blog = await getBlog(id);

  if (!blog) {
    return {
      title: "Blog Post",
      description: "Travel stories and guides from GetMyGuide.",
      alternates: { canonical: `/blogs/${id}` },
    };
  }

  const title = deriveTitle(blog.description);
  const description = blog.description.replace(/\s+/g, " ").trim().slice(0, 160);
  const image = blog.thumbnailUrl || DEFAULT_OG_IMAGE.url;

  return {
    title,
    description,
    alternates: { canonical: `/blogs/${id}` },
    openGraph: {
      title,
      description,
      url: `/blogs/${id}`,
      type: "article",
      publishedTime: blog.createdAt,
      modifiedTime: blog.updatedAt,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const blog = await getBlog(id);

  return (
    <>
      {blog && <JsonLd data={blogPostingSchema(blog, deriveTitle(blog.description))} />}
      <Breadcrumbs
        items={[
          { name: "Blog", href: "/blogs" },
          { name: blog ? deriveTitle(blog.description) : "Post", href: `/blogs/${id}` },
        ]}
      />
      {children}
    </>
  );
}
