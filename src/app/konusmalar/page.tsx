import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Konuşma arşivi",
  description:
    "Merkez bankası yetkililerinin konuşmalarının Türkçe özeti ve şahin/güvercin skoru — yakında.",
};

export default function SpeechesPage() {
  return (
    <ComingSoon title="Konuşma arşivi" phase="Faz 3">
      <p>
        BIS Central Bankers&apos; Speeches arşivinden çekilen konuşmalar Türkçe
        özetlenip -10 (çok güvercin) ile +10 (çok şahin) arasında skorlanacak.
        Her skorun gerekçesi kısa bir Türkçe notla birlikte yayımlanacak.
      </p>
      <p>
        Skorlama tutarlılığı için sabit prompt şablonu, örnekli (few-shot) girdi
        ve periyodik insan denetimi kullanılacak.
      </p>
    </ComingSoon>
  );
}
