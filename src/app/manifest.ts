import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fable",
    short_name: "Fable",
    start_url: "/calendar",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf6f7",
    theme_color: "#fdf6f7",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
