import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bunkmeter",
    short_name: "Bunkmeter",
    description: "See how many classes you can skip and still hit your minimum attendance.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2efe7",
    theme_color: "#f2efe7",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
