import type { MetadataRoute } from "next";

// "Ana ekrana ekle" için ad ve simge. Site Türkçe kökte; başlangıç adresi "/".
// Simgeler src/app/icon.svg ve apple-icon.png dosyalarının adresleridir.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Faiz Radar — Merkez bankası faiz kararları",
    short_name: "Faiz Radar",
    description: "Fed, ECB, TCMB, BoE, BoJ ve RBA faiz kararlarını Türkiye saatiyle takip edin.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f3f7",
    theme_color: "#f1f3f7",
    lang: "tr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
