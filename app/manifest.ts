import type { MetadataRoute } from "next";
import { IMAGES } from "@/lib/images";
import { cloudinaryResize, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#dc2626",
    orientation: "portrait",
    categories: ["travel", "tourism"],
    icons: [
      {
        src: cloudinaryResize(IMAGES.logo, "w_192,h_192,c_fill"),
        sizes: "192x192",
        type: "image/jpeg",
      },
      {
        src: cloudinaryResize(IMAGES.logo, "w_512,h_512,c_fill"),
        sizes: "512x512",
        type: "image/jpeg",
      },
      {
        src: cloudinaryResize(IMAGES.logo, "w_512,h_512,c_fill"),
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
