import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kokpit — zarządzanie życiem",
    short_name: "Kokpit",
    description:
      "Finanse, sprzedaż, zdrowie, zadania, trening i nauka w jednym miejscu. Dane uzupełniasz jednym raportem dziennym.",
    lang: "pl",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    categories: ["productivity", "health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Raport dzienny", short_name: "Raport", url: "/raport" },
      { name: "Zadania na dziś", short_name: "Zadania", url: "/zadania" },
      { name: "Mentor", short_name: "Mentor", url: "/mentor" },
    ],
  };
}
