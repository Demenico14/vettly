import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vettly",
    short_name: "Vettly",
    description: "Smarter Hiring. Faster.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F2EF",
    theme_color: "#163A2E",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
