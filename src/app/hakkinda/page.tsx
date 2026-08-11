import type { Metadata } from "next";
import { getMeetingsFetchedAt } from "@/lib/data/meetings";
import { formatDateTr, formatTimeTrt } from "@/lib/time";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Metodoloji ve kaynaklar",
  description:
    "Merkez Bankaları Radar'ın veri kaynakları, hesaplama yöntemi ve güncelleme sıklığı.",
};

const SOURCES = [
  {
    name: "Federal Reserve — FOMC takvimi",
    url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    note: "Toplantı tarihleri. Karar, toplantının ikinci günü 14:00 New York saatinde açıklanır.",
  },
  {
    name: "ECB — Governing Council takvimi",
    url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
    note: "Para politikası toplantısının ikinci günü, 14:15 Frankfurt saatinde karar; 14:45'te basın toplantısı.",
  },
  {
    name: "TCMB — Duyuru takvimi",
    url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim",
    note: "PPK toplantı kararı, toplantı günü 14:00 Türkiye saatinde açıklanır.",
  },
];

const PLANNED = [
  "FRED API (St. Louis Fed) — Fed Funds futures ve faiz serileri",
  "TCMB EVDS API — politika faizi, enflasyon, kur serileri",
  "ECB SDW (SDMX REST) — ECB faiz kararları ve istatistikleri",
  "BIS Central Bankers' Speeches — konuşma metinleri",
];

export default async function AboutPage() {
  const fetchedAt = await getMeetingsFetchedAt();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Metodoloji ve kaynaklar
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Hangi veriyi nereden aldığımızı ve nasıl işlediğimizi açıkça yazıyoruz.
          Şeffaflık, bu tür bir ürünün en önemli parçasıdır.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Şu anda kullanılan kaynaklar</h2>
        <ul className="space-y-3">
          {SOURCES.map((s) => (
            <li key={s.url} className="rounded-lg border border-border bg-surface p-4">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-medium text-accent hover:underline"
              >
                {s.name}
              </a>
              <p className="mt-1 text-sm text-muted">{s.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Saat dilimi</h2>
        <p className="text-muted">
          Toplantı anları kaynağın yerel saatinden okunur ve UTC olarak saklanır;
          sitede Türkiye saatine (TRT, UTC+3) çevrilerek gösterilir. Yaz saati
          uygulaması olan ülkelerde (ABD, Euro Bölgesi, Birleşik Krallık) TRT
          karşılığı yıl içinde bir saat kayabilir — bu yüzden sabit fark
          varsaymıyor, her toplantıyı ayrı ayrı çeviriyoruz.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Güncelleme sıklığı</h2>
        <p className="text-muted">
          Takvim verisi zamanlanmış bir işle günde bir kez resmî sayfalardan
          yeniden çekilir. Sayfalar en fazla bir saatlik önbellekle sunulur.
        </p>
        {fetchedAt && (
          <p className="mt-2 text-sm text-muted tabular">
            Takvim verisinin son çekilme zamanı: {formatDateTr(fetchedAt)},{" "}
            {formatTimeTrt(fetchedAt)} TRT
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Yol haritasındaki kaynaklar</h2>
        <ul className="list-inside list-disc space-y-1 text-muted">
          {PLANNED.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Faiz olasılığı hesabı</h2>
        <p className="text-muted">
          Faiz olasılıkları, Fed Funds vadeli işlem fiyatlarından PyFedWatch açık
          kaynak metodolojisi temel alınarak bağımsız şekilde hesaplanacaktır.
          CME FedWatch markası veya lisanslı verisi kullanılmaz; yalnızca herkese
          açık vadeli işlem fiyatları girdi olarak alınır. Bu modül henüz yayında
          değildir.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Sorumluluk reddi</h2>
        <p className="text-muted">
          Bu sitedeki bilgiler yalnızca bilgilendirme amaçlıdır ve yatırım
          tavsiyesi değildir. Veriler resmî kaynaklardan otomatik derlenir; hata
          veya gecikme olabilir. Karar vermeden önce merkez bankalarının kendi
          duyurularını esas alın.
        </p>
      </section>
    </div>
  );
}
