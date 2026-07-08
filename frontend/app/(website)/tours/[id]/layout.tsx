import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { touristTripSchema } from "@/lib/seo/jsonld";
import { API_URL, DEFAULT_OG_IMAGE } from "@/lib/seo/config";
import { resolvePackageImageUrl } from "@/lib/utils";
import type { AdminPackage } from "@/types/admin";

async function getPackage(id: string): Promise<AdminPackage | null> {
  try {
    const res = await fetch(`${API_URL}/package/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data ?? body) as AdminPackage;
  } catch {
    return null;
  }
}

function resolveCopy(pkg: AdminPackage) {
  const en = pkg.translations?.en;
  return {
    title: en?.title || pkg.title,
    description: en?.shortDescription || en?.description || pkg.shortDescription || pkg.description,
    places: en?.places || pkg.places || [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getPackage(id);

  if (!pkg) {
    return {
      title: "Tour Package",
      description: "Curated tour packages from GetMyGuide.",
      alternates: { canonical: `/tours/${id}` },
    };
  }

  const { title, description } = resolveCopy(pkg);
  const image = resolvePackageImageUrl(pkg.images?.[0]) || DEFAULT_OG_IMAGE.url;
  const trimmedDescription = (description || "").replace(/<[^>]*>/g, "").trim().slice(0, 160);

  return {
    title,
    description: trimmedDescription,
    alternates: { canonical: `/tours/${id}` },
    openGraph: {
      title,
      description: trimmedDescription,
      url: `/tours/${id}`,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: trimmedDescription,
      images: [image],
    },
  };
}

export default async function TourDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getPackage(id);
  const copy = pkg ? resolveCopy(pkg) : null;
  const images = pkg?.images?.map((img) => resolvePackageImageUrl(img)).filter(Boolean) as string[] | undefined;

  return (
    <>
      {pkg && <JsonLd data={touristTripSchema(pkg, images || [])} />}
      <Breadcrumbs
        items={[
          { name: "Services", href: "/services" },
          { name: copy?.title || "Tour", href: `/tours/${id}` },
        ]}
      />
      {children}
    </>
  );
}
