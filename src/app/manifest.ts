import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chordigo",
    short_name: "Chordigo",
    description: "A little practice. A little progress. Adaptive guitar learning at your own pace.",
    start_url: "/practice",
    scope: "/",
    display: "standalone",
    background_color: "#f4eee2",
    theme_color: "#986342",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
