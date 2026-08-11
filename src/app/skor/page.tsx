import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Şahin/Güvercin skoru",
  description:
    "Merkez bankalarının güncel şahin/güvercin eğilimi ve karşılaştırmalı skor grafiği — yakında.",
};

export default function ScorePage() {
  return (
    <ComingSoon title="Şahin/Güvercin skoru" phase="Faz 3">
      <p>
        Her bankanın son dönem konuşmalarından hesaplanan ortalama eğilim skoru
        burada karşılaştırmalı olarak gösterilecek; zaman içindeki
        şahinleşme/güvercinleşme trendi çizgi grafiğiyle izlenebilecek.
      </p>
    </ComingSoon>
  );
}
