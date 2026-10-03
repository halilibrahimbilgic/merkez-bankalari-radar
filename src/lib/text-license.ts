import type { BankCode } from "./types";

/**
 * Konuşma tam metninin sitede yayımlanabilirliği — yayımcının kendi kullanım
 * şartlarına göre (3 Ekim 2026'da kaynaklarından okundu):
 *
 *  Fed Board  "information on Board's website is in the public domain and may
 *             be copied and distributed without permission. Please cite to the
 *             Board as the source" — federalreserve.gov/disclaimer.htm.
 *             YALNIZCA Board üyeleri. Bölgesel Fed bankaları (New York Fed
 *             vb.) ayrı kurumlardır, içerikleri kamu malı değildir.
 *  ECB        "users … may make free use of the information … it must appear
 *             accurately and the ECB must be cited as the source". YALNIZCA
 *             ECB'nin kendi yöneticileri; Yönetim Konseyi'ndeki ulusal banka
 *             başkanlarının konuşmaları o bankalarındır.
 *  BoJ        "may be copied or reproduced … the source, the Bank of Japan,
 *             should be explicitly credited" (ticari kullanım hariç).
 *  RBA        CC BY 4.0, atıfla.
 *  BoE        yalnızca kişisel/kurum içi kullanım; yeniden yayın izne bağlı.
 *             → yayımlanmaz, kaynağa bağlantı verilir.
 *  diğerleri  bilinmiyor → yayımlanmaz.
 *
 * Kurum, BIS beslemesindeki tanıtım cümlesinden (contextEn) okunur:
 * "Speech by Ms Lisa D Cook, Member of the Board of Governors of the Federal
 * Reserve System, at …". Cümle yoksa yayımlanmaz — şüphede yayımlama.
 */
export type TextLicense = "frb-public-domain" | "ecb" | "boj" | "cc-by-4.0";

export function licenseFor(bankCode: BankCode, contextEn: string | undefined): TextLicense | undefined {
  if (!contextEn) return undefined;
  // Yalnızca konuşmacının unvanı: "Speech by Mr X, Vice Chair of the Board of
  // Governors…, at the … hosted by the Federal Reserve Bank of Kansas City".
  // Etkinlik/yer kısmı kurum belirlemez — Jefferson'ın bölgesel Fed'deki bir
  // konuşması tüm cümleye bakılınca yanlışlıkla dışlanmıştı.
  const role = contextEn.split(/,\s+(?:at|to|before|in|on|during|for)\b/i)[0];
  switch (bankCode) {
    case "fed":
      return /Board of Governors of the Federal Reserve System/i.test(role) &&
        !/Federal Reserve Bank of/i.test(role)
        ? "frb-public-domain"
        : undefined;
    case "ecb":
      return /(President|Vice-President|Member of the Executive Board|Chair of the Supervisory Board|Vice-Chair of the Supervisory Board)\s+of the (European Central Bank|ECB)/i.test(
        role,
      ) && !/Governor of the/i.test(role)
        ? "ecb"
        : undefined;
    case "boj":
      return /Bank of Japan/i.test(role) ? "boj" : undefined;
    case "rba":
      return /Reserve Bank of Australia/i.test(role) ? "cc-by-4.0" : undefined;
    default:
      return undefined;
  }
}

/** Metnin altında gösterilen kaynak ve lisans notu. */
export const LICENSE_NOTICE_TR: Record<TextLicense, string> = {
  "frb-public-domain":
    "Kaynak: Board of Governors of the Federal Reserve System. Metin kamu malıdır (public domain).",
  ecb: "Kaynak: Avrupa Merkez Bankası (ECB). © European Central Bank; kaynak gösterilerek yeniden yayımlanmıştır.",
  boj: "Kaynak: Bank of Japan. © Bank of Japan; kaynak gösterilerek yeniden yayımlanmıştır.",
  "cc-by-4.0":
    "Kaynak: Reserve Bank of Australia. © Reserve Bank of Australia, Creative Commons Attribution 4.0 (CC BY 4.0) lisansıyla.",
};
