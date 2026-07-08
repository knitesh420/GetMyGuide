import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "./config";

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE.url,
    sameAs: [] as string[],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

export function faqPageSchema(qa: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

interface BlogLike {
  id: string;
  description: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export function blogPostingSchema(blog: BlogLike, title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: blog.description,
    image: blog.thumbnailUrl ? [blog.thumbnailUrl] : undefined,
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt,
    mainEntityOfPage: absoluteUrl(`/blogs/${blog.id}`),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_OG_IMAGE.url,
      },
    },
  };
}

interface GuideLike {
  _id: string;
  name: string;
  description?: string;
  about?: string;
  photo?: string;
  profileImage?: string;
  city?: string;
  state?: string;
  country?: string;
  specializations?: string[];
  averageRating?: number;
  numReviews?: number;
}

export function personSchema(guide: GuideLike) {
  const rating =
    guide.averageRating && guide.numReviews
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: guide.averageRating,
            reviewCount: guide.numReviews,
          },
        }
      : {};

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: guide.name,
    description: guide.description || guide.about,
    image: guide.photo || guide.profileImage,
    jobTitle: "Local Tour Guide",
    knowsAbout: guide.specializations,
    address: {
      "@type": "PostalAddress",
      addressLocality: guide.city,
      addressRegion: guide.state,
      addressCountry: guide.country,
    },
    ...rating,
  };
}

interface PackageLike {
  _id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  images?: Array<string | { url?: string; secure_url?: string; publicId?: string }>;
  city?: string;
  places?: string[];
  price?: number;
  baseCurrency?: string;
  numberOfDays?: number;
  averageRating?: number;
  numReviews?: number;
}

export function touristTripSchema(
  pkg: PackageLike,
  resolvedImages: string[],
) {
  const rating =
    pkg.averageRating && pkg.numReviews
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: pkg.averageRating,
            reviewCount: pkg.numReviews,
          },
        }
      : {};

  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: pkg.title,
    description: pkg.shortDescription || pkg.description,
    image: resolvedImages,
    touristType: "Traveler",
    itinerary: pkg.places?.length
      ? {
          "@type": "ItemList",
          itemListElement: pkg.places.map((place, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: place,
          })),
        }
      : undefined,
    offers: pkg.price
      ? {
          "@type": "Offer",
          price: pkg.price,
          priceCurrency: pkg.baseCurrency || "INR",
          availability: "https://schema.org/InStock",
          url: absoluteUrl(`/tours/${pkg._id}`),
        }
      : undefined,
    ...rating,
  };
}
