import Anthropic from "@anthropic-ai/sdk";
import { BANKS } from "./banks";
import type { BankCode } from "./types";

/**
 * Konuşma özetleme ve şahin/güvercin skorlaması.
 *
 * Tutarlılık, plandaki riske karşı üç önlemle sağlanır:
 *  1. Sabit prompt şablonu (aşağıda) — her konuşma aynı ölçütlerle okunur.
 *  2. Yapılandırılmış çıktı — skor her zaman -10..+10 aralığında bir sayı.
 *  3. Örnekli ölçek tanımı — skorun ne anlama geldiği açıkça yazılır.
 */

export const SCORING_MODEL = "claude-opus-5";

/** Prompt değişirse skorlar karşılaştırılamaz olur; sürüm kaydı tutulur. */
export const PROMPT_VERSION = "1";

export interface ScoreResult {
  summaryTr: string;
  hawkDoveScore: number;
  scoreRationaleTr: string;
}

const SYSTEM_PROMPT = `Sen merkez bankası iletişimini analiz eden bir makro ekonomi analistisin. Görevin, verilen konuşmayı Türkçe özetlemek ve para politikası duruşunu şahin/güvercin ölçeğinde puanlamaktır.

ÖLÇEK (-10 ile +10 arası):
  +7..+10  Çok şahin: açık sıkılaşma sinyali, faiz artırımı ima ediliyor
  +3..+6   Şahin: enflasyon endişesi baskın, gevşemeye direnç
  +1..+2   Hafif şahin
   0       Nötr / dengeli: iki yönlü risklere eşit vurgu, veri bağımlılığı
  -1..-2   Hafif güvercin
  -3..-6   Güvercin: büyüme/istihdam endişesi baskın, gevşemeye açık
  -7..-10  Çok güvercin: açık gevşeme sinyali, faiz indirimi ima ediliyor

PUANLAMA KURALLARI:
- Yalnızca para politikası duruşunu puanla. Finansal istikrar, ödeme sistemleri,
  denetim veya kurumsal konular içeren konuşmalar para politikası sinyali
  taşımıyorsa 0 ver ve gerekçede bunu belirt.
- Konuşmacının kendi görüşünü esas al, aktardığı başkalarının görüşünü değil.
- Geçmiş kararları anlatmak sinyal değildir; ileriye dönük ifadeleri tart.
- Emin değilsen uç puanlardan kaçın; ölçeğin ortasına yaklaş.

ÖZET KURALLARI:
- 3-5 cümle, akıcı Türkçe. Konuşmanın para politikası açısından önemli
  noktalarını aktar.
- "Şahin" ve "güvercin" terimlerini Türkçe finans dilindeki yerleşik
  anlamlarıyla kullanabilirsin.
- Yatırım tavsiyesi verme, tahmin yürütme. Yalnızca konuşmada söyleneni aktar.

GEREKÇE KURALLARI:
- 1-2 cümle. Puanı hangi ifadelere dayandırdığını somut olarak yaz.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary_tr: {
      type: "string",
      description: "Konuşmanın 3-5 cümlelik Türkçe özeti",
    },
    hawk_dove_score: {
      type: "number",
      description: "-10 (çok güvercin) ile +10 (çok şahin) arası puan",
    },
    score_rationale_tr: {
      type: "string",
      description: "Puanın 1-2 cümlelik Türkçe gerekçesi",
    },
  },
  required: ["summary_tr", "hawk_dove_score", "score_rationale_tr"],
  additionalProperties: false,
} as const;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY tanımlı değil. .env.local dosyasına ekleyin.",
    );
  }
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/** Uzun konuşmalarda maliyeti sınırlamak için metin kırpılır. */
const MAX_CHARS = 60_000;

export async function scoreSpeech(input: {
  bankCode: BankCode;
  speakerName: string;
  title: string;
  speechDate: string;
  text: string;
}): Promise<ScoreResult> {
  const bank = BANKS[input.bankCode];
  const text =
    input.text.length > MAX_CHARS
      ? input.text.slice(0, MAX_CHARS) + "\n\n[metin uzunluk nedeniyle kırpıldı]"
      : input.text;

  const response = await getClient().messages.create({
    model: SCORING_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Banka: ${bank.nameTr} (${bank.nameEn})
Konuşmacı: ${input.speakerName}
Tarih: ${input.speechDate}
Başlık: ${input.title}

Konuşma metni:
---
${text}
---`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model içeriği değerlendirmeyi reddetti");
  }

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Modelden metin bloğu dönmedi");
  }

  const parsed = JSON.parse(block.text) as {
    summary_tr: string;
    hawk_dove_score: number;
    score_rationale_tr: string;
  };

  // Şema sayıyı garanti eder ama aralığı etmez — sınırla.
  const score = Math.max(-10, Math.min(10, parsed.hawk_dove_score));

  return {
    summaryTr: parsed.summary_tr,
    hawkDoveScore: Math.round(score * 10) / 10,
    scoreRationaleTr: parsed.score_rationale_tr,
  };
}
