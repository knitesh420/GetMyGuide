import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { personSchema } from "@/lib/seo/jsonld";
import { API_URL, DEFAULT_OG_IMAGE } from "@/lib/seo/config";
import type { GuideProfile } from "@/lib/data";

async function getGuide(id: string): Promise<GuideProfile | null> {
  try {
    const res = await fetch(`${API_URL}/guides/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data ?? body) as GuideProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const guide = await getGuide(id);

  if (!guide) {
    return {
      title: "Guide Profile",
      description: "Book a certified local guide on GetMyGuide.",
      alternates: { canonical: `/find-guides/${id}/book` },
    };
  }

  const location = [guide.city, guide.state, guide.country].filter(Boolean).join(", ");
  const title = `${guide.name}${location ? ` — Local Guide in ${location}` : " — Local Guide"}`;
  const description = (
    guide.description ||
    guide.about ||
    `Book ${guide.name}, a certified local guide${location ? ` in ${location}` : ""}, on GetMyGuide.`
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const image = guide.photo || guide.profileImage || DEFAULT_OG_IMAGE.url;

  return {
    title,
    description,
    alternates: { canonical: `/find-guides/${id}/book` },
    openGraph: {
      title,
      description,
      url: `/find-guides/${id}/book`,
      type: "profile",
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

export default async function GuideBookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guide = await getGuide(id);
  const region = guide?.state || guide?.city;

  return (
    <>
      {guide && <JsonLd data={personSchema(guide)} />}
      <Breadcrumbs
        items={[
          { name: "Find Guides", href: "/find-guides" },
          ...(region ? [{ name: region, href: `/find-guides?location=${encodeURIComponent(region)}` }] : []),
          { name: guide?.name || "Guide", href: `/find-guides/${id}/book` },
        ]}
      />
      {children}
    </>
  );
}
