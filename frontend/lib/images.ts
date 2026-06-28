const CDN = "https://res.cloudinary.com/dmpz3k4mb/image/upload";
const BASE = `${CDN}/getmyguide/public`;

export const IMAGES = {
  // Background / scene images
  scene1: `${BASE}/1.jpg`,
  scene2: `${BASE}/2.jpg`,
  scene3: `${BASE}/3.jpg`,
  scene4: `${BASE}/4.jpg`,
  scene5: `${BASE}/5.jpg`,

  // About page images
  aboutHero: `${BASE}/about-hero.jpg`,
  aboutAims: `${BASE}/about-aims.jpg`,
  aboutGuide: `${BASE}/about-guide.jpg`,
  aboutVideo: `${BASE}/about-video.jpg`,
  aboutYoutube: `${BASE}/about-youtube.jpg`,
  goldenTriangle: `${BASE}/Golden_Triangle.jpg`,

  // Brand assets
  logo: `/images/new_logo.jpeg`,
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
