import Anthropic from "@anthropic-ai/sdk";
import { BANKS } from "./banks";
import { SCORE_SCALE } from "./score-scale";
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
/**
 * 3: puanlama ölçeği ve kuralları 2 ile aynı; çıktıya iki dilli site için
 * İngilizce özet/gerekçe ve Türkçe başlık/tanıtım eklendi. Skorlar 2 ile
 * karşılaştırılabilir.
 */
export const PROMPT_VERSION = "3";

/**
 * Cron'da API anahtarı yerine Claude aboneliğiyle (claude-code-action +
 * CLAUDE_CODE_OAUTH_TOKEN) skorlarken kullanılan model takma adı. Prompt
 * aynı olduğu için skorlar "api" ve "session" kayıtlarıyla karşılaştırılabilir.
 */
export const CLAUDE_CODE_MODEL = "opus";

export interface ScoreResult {
  summaryTr: string;
  hawkDoveScore: number;
  scoreRationaleTr: string;
  hasPolicySignal: boolean;
  summaryEn: string;
  scoreRationaleEn: string;
  titleTr: string;
  /** Tanıtım cümlesi yoksa boş. */
  contextTr: string;
}

export const SYSTEM_PROMPT = `Sen merkez bankası iletişimini analiz eden bir makro ekonomi analistisin. Görevin, verilen konuşmayı Türkçe özetlemek ve para politikası duruşunu şahin/güvercin ölçeğinde puanlamaktır.

${SCORE_SCALE}

PUANLAMA KURALLARI:
- Yalnızca para politikası duruşunu puanla. Finansal istikrar, ödeme sistemleri,
  denetim veya kurumsal konular içeren konuşmalar para politikası sinyali
  taşımıyorsa 0 ver, has_policy_signal alanını false yap ve gerekçede belirt.
- has_policy_signal ile puan farklı şeylerdir: dengeli bir duruş sergileyen ama
  para politikasından söz eden konuşma 0 puan alır ve has_policy_signal true
  olur; hiç söz etmeyen konuşma 0 puan alır ve false olur.
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
- 1-2 cümle. Puanı hangi ifadelere dayandırdığını somut olarak yaz.

İKİNCİ DİL (site Türkçe ve İngilizce yayımlanır):
- summary_en ve score_rationale_en: Türkçe özetin ve gerekçenin aynı içerikte,
  doğal İngilizcesi. Yeni bilgi ekleme, çıkarma. "Hawkish"/"dovish" kullan.
- title_tr: konuşma başlığının Türkçesi. Özel adları (kurum, etkinlik adı)
  koru; kısa ve doğal tut.
- context_tr: "Tanıtım" satırının Türkçesi; tanıtım yoksa boş metin.`;

export const OUTPUT_SCHEMA = {
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
    has_policy_signal: {
      type: "boolean",
      description:
        "Konuşma para politikası duruşuna dair bir sinyal taşıyor mu? Düzenleme/denetim konuşmalarında false.",
    },
    summary_en: {
      type: "string",
      description: "Türkçe özetin aynı içerikte İngilizcesi",
    },
    score_rationale_en: {
      type: "string",
      description: "Gerekçenin İngilizcesi",
    },
    title_tr: {
      type: "string",
      description: "Konuşma başlığının Türkçesi",
    },
    context_tr: {
      type: "string",
      description: "Tanıtım cümlesinin Türkçesi; tanıtım yoksa boş metin",
    },
  },
  required: [
    "summary_tr",
    "hawk_dove_score",
    "score_rationale_tr",
    "has_policy_signal",
    "summary_en",
    "score_rationale_en",
    "title_tr",
    "context_tr",
  ],
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

export interface SpeechInput {
  bankCode: BankCode;
  speakerName: string;
  title: string;
  speechDate: string;
  /** BIS tanıtım cümlesi (konuşmacının unvanı, etkinlik, yer). */
  contextEn?: string;
  text: string;
}

/** Modele giden kullanıcı mesajı — API ve Claude Code yolu aynı metni görür. */
export function buildUserMessage(input: SpeechInput): string {
  const bank = BANKS[input.bankCode];
  const text =
    input.text.length > MAX_CHARS
      ? input.text.slice(0, MAX_CHARS) + "\n\n[metin uzunluk nedeniyle kırpıldı]"
      : input.text;

  return `Banka: ${bank.nameTr} (${bank.nameEn})
Konuşmacı: ${input.speakerName}
Tarih: ${input.speechDate}
Başlık: ${input.title}
Tanıtım: ${input.contextEn ?? ""}

Konuşma metni:
---
${text}
---`;
}

/**
 * Model çıktısını doğrular ve ScoreResult'a çevirir. Claude Code yolunda
 * yapılandırılmış çıktı garantisi yok; bu yüzden her alan elle denetlenir.
 */
export function parseScoreOutput(raw: unknown): ScoreResult {
  const o = raw as Record<string, unknown>;
  if (
    !o ||
    typeof o.summary_tr !== "string" ||
    typeof o.score_rationale_tr !== "string" ||
    typeof o.has_policy_signal !== "boolean" ||
    typeof o.hawk_dove_score !== "number" ||
    !Number.isFinite(o.hawk_dove_score) ||
    typeof o.summary_en !== "string" ||
    typeof o.score_rationale_en !== "string" ||
    typeof o.title_tr !== "string" ||
    typeof o.context_tr !== "string"
  ) {
    throw new Error("çıktı şemaya uymuyor");
  }
  if (o.summary_tr.trim().length < 50) throw new Error("özet çok kısa");
  if (o.summary_en.trim().length < 50) throw new Error("İngilizce özet çok kısa");
  if (!o.title_tr.trim()) throw new Error("Türkçe başlık boş");

  // Şema sayıyı garanti eder ama aralığı etmez — sınırla.
  const score = Math.max(-10, Math.min(10, o.hawk_dove_score));
  return {
    summaryTr: o.summary_tr.trim(),
    // Sinyalsiz konuşma tanım gereği 0'dır (bkz. PUANLAMA KURALLARI).
    hawkDoveScore: o.has_policy_signal ? Math.round(score * 10) / 10 : 0,
    scoreRationaleTr: o.score_rationale_tr.trim(),
    hasPolicySignal: o.has_policy_signal,
    summaryEn: o.summary_en.trim(),
    scoreRationaleEn: o.score_rationale_en.trim(),
    titleTr: o.title_tr.trim(),
    contextTr: o.context_tr.trim(),
  };
}

export async function scoreSpeech(input: SpeechInput): Promise<ScoreResult> {
  const response = await getClient().messages.create({
    model: SCORING_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model içeriği değerlendirmeyi reddetti");
  }

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Modelden metin bloğu dönmedi");
  }

  return parseScoreOutput(JSON.parse(block.text));
}
