import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChamoEntregas",
    short_name: "ChamoEntregas",
    description:
      "Pide comida, envía paquetes y haz mandados en Coloncito, Táchira.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdfb",
    theme_color: "#0B347A",
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
