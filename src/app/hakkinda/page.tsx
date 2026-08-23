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
    name: "Atlanta Fed — Market Probability Tracker",
    url: "https://www.atlantafed.org/research-and-data/data/market-probability-tracker",
    note: "Faiz olasılıkları. CME 3 aylık SOFR opsiyon fiyatlarından türetilen dağılımlar; toplantı bazlı değil, üçer aylık ortalama faiz üzerinedir.",
  },
  {
    name: "FRED (St. Louis Fed)",
    url: "https://fred.stlouisfed.org/",
    note: "Fed hedef aralığının geçmişi (DFEDTARU / DFEDTARL) — geçmiş toplantıların karar oranlarını doldurmak için.",
  },
  {
    name: "BIS — Central Bankers' Speeches",
    url: "https://www.bis.org/cbspeeches/index.htm",
    note: "Konuşma metinleri. Besleme yalnızca son 25 konuşmayı verir ve sayfalama kabul etmez; arşiv günlük çalışan işle zaman içinde birikir.",
  },
  {
    name: "TCMB — Duyuru takvimi",
    url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim",
    note: "PPK toplantı kararı, toplantı günü 14:00 Türkiye saatinde açıklanır.",
  },
];

const PLANNED = [
  "TCMB EVDS API — politika faizi, enflasyon, kur serileri",
  "ECB SDW (SDMX REST) — ECB faiz kararları ve istatistikleri",
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
              <p className="prose-width mt-1 text-sm text-muted">{s.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Saat dilimi</h2>
        <p className="prose-width text-muted">
          Toplantı anları kaynağın yerel saatinden okunur ve UTC olarak saklanır;
          sitede Türkiye saatine (TRT, UTC+3) çevrilerek gösterilir. Yaz saati
          uygulaması olan ülkelerde (ABD, Euro Bölgesi, Birleşik Krallık) TRT
          karşılığı yıl içinde bir saat kayabilir — bu yüzden sabit fark
          varsaymıyor, her toplantıyı ayrı ayrı çeviriyoruz.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Güncelleme sıklığı</h2>
        <p className="prose-width text-muted">
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
        <ul className="prose-width list-inside list-disc space-y-1 text-muted">
          {PLANNED.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Faiz olasılığı hesabı</h2>
        <div className="prose-width space-y-3 text-muted">
          <p>
            Olasılıkları kendimiz hesaplamıyoruz. Bunun nedeni şudur: piyasa bazlı
            olasılık için Fed Funds ya da SOFR vadeli işlem/opsiyon fiyatları
            gerekir; bu fiyatlar CME&apos;nin lisanslı verisidir ve CME kendi
            sayfalarından otomatik veri çekilmesini kullanım şartlarıyla
            yasaklamıştır. Kendi hesaplama motorumuzu yazmak bu kısıtı ortadan
            kaldırmaz — girdi verisinin kendisi lisanslıdır.
          </p>
          <p>
            Bu yüzden Atlanta Fed&apos;in kamuya açık olarak yayımladığı Market
            Probability Tracker dağılımlarını olduğu gibi gösteriyor ve kaynağını
            açıkça belirtiyoruz. Bu veri yalnızca kişisel ve eğitim amaçlı
            kullanıma izinlidir; sitenin konumlandırması da buna göredir.
          </p>
          <p>
            Önemli bir ayrım: bu dağılımlar tek bir FOMC toplantısına ait değil,
            üçer aylık dönemlerde <em>ortalama</em> gecelik faize ilişkindir.
            CME FedWatch tarzı &quot;toplantıda 25 baz puan indirim ihtimali&quot;
            rakamlarıyla doğrudan karşılaştırılamaz.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Şahin/güvercin skorlaması</h2>
        <div className="prose-width space-y-3 text-muted">
          <p>
            Konuşmalar Claude API ile Türkçe özetlenir ve -10 (çok güvercin) ile
            +10 (çok şahin) arasında puanlanır. Skor, konuşmanın para politikası
            duruşunu ölçer; finansal istikrar veya denetim konulu konuşmalar
            sinyal taşımıyorsa 0 puan alır.
          </p>
          <p>
            Plandaki tutarlılık riskine karşı üç önlem alınmıştır: her konuşma
            aynı sabit prompt şablonuyla okunur, çıktı şema ile kısıtlanır
            (puan her zaman aralık içinde bir sayıdır) ve ölçeğin her basamağı
            prompt içinde açıkça tanımlanır. Her kaydın yanında hangi model ve
            hangi prompt sürümüyle üretildiği saklanır — prompt değişirse eski
            ve yeni skorlar ayırt edilebilir.
          </p>
          <p>
            Sıfır puan iki farklı şey olabilir: dengeli bir duruş, ya da hiç
            para politikası sinyali taşımayan bir konuşma. Bunları ayırıyoruz —
            düzenleme ve denetim konuşmaları &quot;sinyalsiz&quot; işaretlenir
            ve banka ortalamalarına katılmaz, aksi hâlde ortalamayı yapay olarak
            sıfıra çekerlerdi.
          </p>
          <p>
            Özet ve skor otomatik üretilir; hata payı vardır ve orijinal metnin
            yerini tutmaz. Her konuşma sayfasında kaynak metne bağlantı verilir.
            BIS bazı konuşmaların yalnızca giriş bölümünü HTML olarak yayımlar;
            bu kayıtlar arayüzde açıkça işaretlenir.
          </p>
          <p>
            Arşivin ilk 11 kaydı, API kredisi bulunmadığından toplu iş yerine
            bir Claude Code oturumunda aynı ölçek ve kurallarla puanlanmıştır.
            Bu kayıtlar ayrıca işaretlidir ve kredi eklendiğinde toplu işle
            yeniden üretilebilir.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Sorumluluk reddi</h2>
        <p className="prose-width text-muted">
          Bu site kişisel kullanım ve eğitim amaçlıdır. Buradaki bilgiler yatırım
          tavsiyesi değildir. Veriler resmî kaynaklardan otomatik derlenir; hata
          veya gecikme olabilir. Karar vermeden önce merkez bankalarının kendi
          duyurularını esas alın.
        </p>
      </section>
    </div>
  );
}
