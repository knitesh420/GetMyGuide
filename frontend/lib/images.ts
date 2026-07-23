const CDN = "https://res.cloudinary.com/dmpz3k4mb/image/upload";
const BASE = `${CDN}/getmyguide/public`;

/**
 * Resolve a stored guide image reference to a displayable URL.
 *
 * Guide photos now upload to Cloudinary and are stored as absolute URLs, but
 * records created before that change hold a bare filename that only resolves
 * against the backend's /media/misc mount. Both shapes are in the database, so
 * both must render.
 */
export function guideImageUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Legacy: some records stored a rooted path, others a bare filename.
  if (value.startsWith("/media/")) return `${apiBase}${value}`;
  return `${apiBase}/media/misc/${value}`;
}

export const IMAGES = {
  // Background / scene images
  scene1: `${BASE}/1.jpg`,
  scene2: `${BASE}/2.jpg`,
  scene3: `${BASE}/3.jpg`,
  scene4: `${BASE}/4.jpg`,
  scene5: `${BASE}/5.jpg`,
  howItWorkHero: `${BASE}/how-it-work.jpg`,

  // About page images
  // Served from /public rather than the CDN: this is a self-contained flyer
  // (headline + trust badges baked in), so it ships with the app.
  aboutHero: "/about-banner.jpg",
  aboutAims: `${BASE}/about-aims.jpg`,
  aboutGuide: `${BASE}/about-guide.jpg`,
  aboutVideo: `${BASE}/about-video.jpg`,
  aboutYoutube: `${BASE}/about-youtube.jpg`,
  goldenTriangle: `${BASE}/Golden_Triangle.jpg`,

  // Contact page images
  // Also served from /public: both are self-contained flyers with their own
  // headline, phone, email and address baked in.
  contactHero: "/contact-us.jpg",
  contactAddress: "/address.jpg",

  // Brand assets
  logo: `${BASE}/images/new_logo.jpg`,
  mastercard: `${BASE}/mastercard.png`,
  visa: `${BASE}/visa.png`,

  // Hero carousel
  heroCarousel: [
    `${BASE}/hero/hero-1.jpg`,
    `${BASE}/hero/hero-2.jpg`,
    `${BASE}/hero/hero-3.jpg`,
    `${BASE}/hero/hero-4.jpg`,
    `${BASE}/hero/hero-5.jpg`,
    `${BASE}/hero/hero-6.jpg`,
    `${BASE}/hero/hero-7.jpg`,
    `${BASE}/hero/hero-8.jpg`,
    `${BASE}/hero/hero-9.jpg`,
  ],

  // Social / Instagram section
  social: [
    `${BASE}/hero/p1.jpg`,
    `${BASE}/hero/p2.jpg`,
    `${BASE}/hero/p3.jpg`,
    `${BASE}/hero/p4.jpg`,
    `${BASE}/hero/p5.jpg`,
    `${BASE}/hero/p6.jpg`,
    `${BASE}/hero/p7.jpg`,
    `${BASE}/hero/p8.jpg`,
    `${BASE}/hero/p9.jpg`,
  ],

  // Team / person headshots
  team: {
    founderCeo: `${BASE}/indian-businessman-founder-ceo.jpg`,
    operationsManager: `${BASE}/indian-businesswoman-operations-manager.jpg`,
    techDirector: `${BASE}/indian-tech-director-software-engineer.jpg`,
    photographerGuide: `${BASE}/professional-asian-man-photographer-headshot.jpg`,
    adventureGuide: `${BASE}/professional-man-adventure-guide-headshot.jpg`,
    manSmiling: `${BASE}/professional-man-smiling-headshot.png`,
    womanChef: `${BASE}/professional-woman-chef-headshot.png`,
    womanOutdoor: `${BASE}/professional-woman-outdoor-enthusiast-headshot.jpg`,
    womanSmiling: `${BASE}/professional-woman-smiling-headshot.png`,
  },
} as const;
