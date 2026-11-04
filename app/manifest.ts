import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Хужирт — Khujirt",
    short_name: "Хужирт",
    description: "Хужиртын байгалийн эрдэст ус · Khujirt natural mineral water",
    start_url: "/mn",
    display: "standalone",
    background_color: "#f2f9fe",
    theme_color: "#e3f2fb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
