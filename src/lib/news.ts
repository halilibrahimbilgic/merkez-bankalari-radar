import type { BankCode } from "./types";

/**
 * Haber akışı — resmî açıklamalar ve önemli kişilerin sözlerini aktaran
 * haberler.
 *
 * Telif sınırı: yalnızca yayıncıların kendi sunduğu RSS/Atom akışları okunur;
 * haber metni kopyalanmaz. Sitede başlık, akıştaki kısa açıklamadan BİZİM
 * yazdığımız 1–2 cümlelik özet ve kaynağa bağlantı durur. X/Twitter
 * kullanılmaz: kullanım şartları otomatik çekmeyi yasaklıyor, API ücretli.
 *
 * Akış (her 30 dk, .github/workflows/news.yml):
 *   news:fetch  → .news/TASK.md + .news/in/batch.json (yalnızca yeni öğeler)
 *   claude-code-action (Sonnet) → .news/out/batch.json
 *   news:import → şema denetimi → data/news/news.json
 *   telegram:post -- --news → önemli olanlar kanala
 */

export type NewsKind = "official" | "media";

export interface NewsSource {
  key: string;
  /** Okuyucuya gösterilen yayıncı adı. */
  name: string;
  kind: NewsKind;
  url: string;
  /** Akışın dili — Türkçe akışlarda özgün başlık zaten Türkçedir. */
  lang: "tr" | "en";
  bankCode?: BankCode;
}

const TCMB_RSS = "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/RSS";

/** Doğrulama: hepsi 12 Ekim 2026'da projenin user-agent'ıyla 200 ve dolu döndü. */
export const NEWS_SOURCES: NewsSource[] = [
  { key: "fed-press", name: "Federal Reserve", kind: "official", lang: "en", bankCode: "fed", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { key: "fed-speeches", name: "Federal Reserve", kind: "official", lang: "en", bankCode: "fed", url: "https://www.federalreserve.gov/feeds/speeches.xml" },
  { key: "fed-testimony", name: "Federal Reserve", kind: "official", lang: "en", bankCode: "fed", url: "https://www.federalreserve.gov/feeds/testimony.xml" },
  { key: "ecb", name: "ECB", kind: "official", lang: "en", bankCode: "ecb", url: "https://www.ecb.europa.eu/rss/press.html" },
  { key: "boe-news", name: "Bank of England", kind: "official", lang: "en", bankCode: "boe", url: "https://www.bankofengland.co.uk/rss/news" },
  { key: "boe-speeches", name: "Bank of England", kind: "official", lang: "en", bankCode: "boe", url: "https://www.bankofengland.co.uk/rss/speeches" },
  { key: "boj", name: "Bank of Japan", kind: "official", lang: "en", bankCode: "boj", url: "https://www.boj.or.jp/en/rss/whatsnew.xml" },
  { key: "rba-media", name: "Reserve Bank of Australia", kind: "official", lang: "en", bankCode: "rba", url: "https://www.rba.gov.au/rss/rss-cb-media-releases.xml" },
  { key: "rba-speeches", name: "Reserve Bank of Australia", kind: "official", lang: "en", bankCode: "rba", url: "https://www.rba.gov.au/rss/rss-cb-speeches.xml" },
  { key: "tcmb-basin", name: "TCMB", kind: "official", lang: "tr", bankCode: "tcmb", url: `${TCMB_RSS}/Basin+Duyurulari` },
  { key: "tcmb-baskan", name: "TCMB", kind: "official", lang: "tr", bankCode: "tcmb", url: `${TCMB_RSS}/Baskanin+Konusmalari` },
  { key: "cnbc-economy", name: "CNBC", kind: "media", lang: "en", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html" },
  { key: "cnbc-finance", name: "CNBC", kind: "media", lang: "en", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html" },
  { key: "bbc-business", name: "BBC News", kind: "media", lang: "en", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { key: "ft", name: "Financial Times", kind: "media", lang: "en", url: "https://www.ft.com/rss/home" },
  { key: "marketwatch", name: "MarketWatch", kind: "media", lang: "en", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  { key: "guardian-business", name: "The Guardian", kind: "media", lang: "en", url: "https://www.theguardian.com/business/rss" },
  { key: "aa-ekonomi", name: "Anadolu Ajansı", kind: "media", lang: "tr", url: "https://www.aa.com.tr/tr/rss/default?cat=ekonomi" },
  { key: "aa-economy", name: "Anadolu Agency", kind: "media", lang: "en", url: "https://www.aa.com.tr/en/rss/default?cat=economy" },
];

/**
 * Basın akışlarından yalnızca bu konulara değenler modele gider — gerisi
 * (şirket haberi, teknoloji…) hiç işlenmez. Asıl eleme modelde
 * (`relevant`); bu ön süzgeç abonelik kullanımını sınırlar.
 */
const MEDIA_FILTER = new RegExp(
  [
    // Kurumlar
    String.raw`\bFed\b`, "Federal Reserve", "FOMC", String.raw`\bECB\b`, "European Central Bank",
    "Bank of England", String.raw`\bBoE\b`, "Bank of Japan", String.raw`\bBoJ\b`, String.raw`\bRBA\b`,
    "Reserve Bank", "central bank", "Treasury", String.raw`\bIMF\b`, "Monetary Fund",
    "Merkez Bankası", String.raw`\bTCMB\b`, String.raw`\bPPK\b`, "Hazine ve Maliye",
    // Kişiler (soyadı yeterli; yanlış eşleşmeyi model eler)
    "Powell", "Jefferson", "Waller", "Bowman", "Barr", "Williams", "Lagarde", "Schnabel", "Lane",
    "de Guindos", "Cipollone", "Bailey", "Ramsden", "Lombardelli", "Ueda", "Himino", "Bullock",
    "Hauser", "Karahan", "Şimşek", "Simsek", "Bessent", "Georgieva", "Reeves",
    // Konular
    "interest rate", "rate cut", "rate hike", "inflation", "bond yield", "Treasury yield",
    "faiz", "enflasyon", "döviz",
  ].join("|"),
  "i",
);

export function passesMediaFilter(text: string): boolean {
  return MEDIA_FILTER.test(text);
}

/** data/news/news.json'daki kayıt. */
export interface NewsItem {
  id: string;
  sourceKey: string;
  sourceName: string;
  kind: NewsKind;
  bankCode?: BankCode;
  url: string;
  /** UTC ISO */
  publishedAt: string;
  titleOriginal: string;
  titleTr: string;
  summaryTr: string;
  titleEn: string;
  summaryEn: string;
  /** Telegram'a gidecek kadar önemli mi (modelin kararı). */
  important: boolean;
  processedAt: string;
}

export interface NewsStore {
  fetchedAt: string;
  items: NewsItem[];
  /** Model "ilgisiz" dediği öğeler — tekrar gönderilmesin diye kimlik → gün. */
  rejected: Record<string, string>;
}

/** Modele giden öğe. */
export interface NewsInput {
  id: string;
  source: string;
  kind: NewsKind;
  publishedAt: string;
  title: string;
  description: string;
}

export const NEWS_MODEL = "sonnet";

export const NEWS_PROMPT = `Sen bir finans haber editörüsün. Türkçe yayın yapan, merkez bankası
faiz kararlarını izleyen bir sitenin haber akışını hazırlıyorsun. Sana verilen
her öğe bir resmî kurum açıklaması ya da bir haber sitesinin RSS başlığı ve
kısa açıklamasıdır.

Her öğe için karar ver ve yaz:

relevant: Öğe şu konulardan birine doğrudan ilişkin mi? Para politikası ve
  faiz kararları; merkez bankası yetkililerinin açıklamaları; enflasyon,
  istihdam gibi politikayı etkileyen veriler; tahvil/kur piyasalarındaki
  önemli hareketler; maliye bakanları, hazine ve IMF'nin ekonomi politikası
  açıklamaları. Şirket haberleri, banknot tasarımı, personel atamaları, tek
  bir bankaya yönelik denetim/ceza işlemleri, istatistik yayın takvimleri ve
  etkinlik duyuruları İLGİSİZDİR (false).

important: Kanala anında bildirim gönderilecek kadar önemli mi? Yalnızca:
  faiz kararları ve olağanüstü politika adımları; merkez bankası başkanı,
  maliye bakanı/hazine sekreteri gibi kilit kişilerin politika yönüne dair
  sözleri; piyasaları belirgin biçimde etkileyen gelişmeler. Emin değilsen
  false. ilgisiz öğe asla önemli değildir.

title_tr / summary_tr: Türkçe başlık (en fazla ~90 karakter) ve 1–2 cümlelik
  özet. YALNIZCA verilen başlık ve açıklamadaki bilgiyi kullan; tahmin, yorum
  ve yatırım tavsiyesi ekleme. Sözleri kime ait olduğunu belirterek aktar
  ("Lagarde, ... dedi"). Açıklama boşsa özet başlığı açan tek cümle olsun.
  Kaynak metni kelimesi kelimesine çevirip uzun alıntı yapma — kendi
  cümlelerinle özetle.

title_en / summary_en: Aynı içeriğin İngilizcesi, aynı kurallarla.

Aynı olayı anlatan birden çok öğe varsa (farklı yayıncılardan) yalnızca en
bilgilendirici olanı relevant=true yap, diğerlerini false.

İlgisiz öğelerde başlık ve özet alanlarını boş bırakabilirsin.`;

export const NEWS_OUTPUT_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      relevant: { type: "boolean" },
      important: { type: "boolean" },
      title_tr: { type: "string" },
      summary_tr: { type: "string" },
      title_en: { type: "string" },
      summary_en: { type: "string" },
    },
    required: ["id", "relevant", "important", "title_tr", "summary_tr", "title_en", "summary_en"],
  },
} as const;

export interface NewsResult {
  id: string;
  relevant: boolean;
  important: boolean;
  titleTr: string;
  summaryTr: string;
  titleEn: string;
  summaryEn: string;
}

/** Model çıktısı güvenilmez girdidir: her alan elle denetlenir, uzunluk sınırlanır. */
export function parseNewsOutput(raw: unknown): NewsResult[] {
  if (!Array.isArray(raw)) throw new Error("çıktı dizi değil");
  const clip = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
  const out: NewsResult[] = [];
  for (const o of raw as Record<string, unknown>[]) {
    if (!o || typeof o.id !== "string" || typeof o.relevant !== "boolean") continue;
    const r: NewsResult = {
      id: o.id,
      relevant: o.relevant,
      important: o.relevant && o.important === true,
      titleTr: clip(o.title_tr, 160),
      summaryTr: clip(o.summary_tr, 600),
      titleEn: clip(o.title_en, 160),
      summaryEn: clip(o.summary_en, 600),
    };
    // İlgili ama başlığı boş öğe yayımlanamaz — ilgisiz say.
    if (r.relevant && (!r.titleTr || !r.titleEn)) r.relevant = r.important = false;
    out.push(r);
  }
  return out;
}
