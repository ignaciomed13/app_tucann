import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TuCann — Journal de cultivo",
    short_name: "TuCann",
    description:
      "Journal de cultivo: fase del ciclo, riego, nutrición, sanidad y análisis con IA.",
    start_url: "/dashboard",
    display: "standalone",
    // background_color = color del splash: igual al --background de la app
    // para que no pegue un salto de color al terminar de cargar.
    background_color: "#f3f2e0",
    theme_color: "#008236",
    lang: "es",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
