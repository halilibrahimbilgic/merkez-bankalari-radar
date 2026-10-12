import { OG_SIZE } from "@/lib/og";
import { homeOgImage } from "@/views/og-images";

// Kök görsel: kendi görseli olmayan bütün sayfaların varsayılanı.
// Yaklaşan kararlar değiştikçe güncel kalsın diye saatlik yenilenir.
export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Faiz Radar — merkez bankası faiz kararları, Türkiye saatiyle";

export default function Image() {
  return homeOgImage("tr");
}
