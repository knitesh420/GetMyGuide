import { JsonLd } from "./JsonLd";
import { breadcrumbSchema, type BreadcrumbItem } from "@/lib/seo/jsonld";

/**
 * Emits the breadcrumb structured data for SEO (rich results in search) only.
 * The visible "Home > ..." bar was intentionally removed; keeping the JSON-LD
 * preserves the breadcrumb signal for Google without showing UI on the page.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const trail: BreadcrumbItem[] = [{ name: "Home", href: "/" }, ...items];

  return <JsonLd data={breadcrumbSchema(trail)} />;
}
