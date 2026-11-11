import { bankName, bankWithCountryTr } from "@/lib/banks";
import { L, type Lang } from "@/lib/i18n";
import { faqLd } from "@/lib/json-ld";
import { formatDate, formatTimeTrt, formatWeekday } from "@/lib/time";
import type { CentralBank, Meeting } from "@/lib/types";

/**
 * Banka sayfasının sık sorulan sorular işareti (FAQPage). Sorular Search
 * Console'daki gerçek sorgulardır; cevaplar sayfada zaten görünen veridir
 * (sıradaki karar kartı, güncel faiz): görünmeyen veri işaretlenmez.
 * Veri yoksa o soru hiç sorulmaz; hiç soru kalmazsa işaret de yok.
 */
export function bankFaqLd(opts: {
  lang: Lang;
  bank: CentralBank;
  next?: Meeting;
  /** formatCurrentRate çıktısı ve "şu tarihten beri" günü. */
  rate?: { text: string; since: string };
}) {
  const { lang, bank, next, rate } = opts;
  const t = L(lang);
  const tr = bankWithCountryTr(bank.code);
  const name = bankName(bank, lang);
  const qa: { q: string; a: string }[] = [];

  if (next) {
    const day = `${formatDate(next.meetingAt, lang)} ${formatWeekday(next.meetingAt, lang)}`;
    qa.push({
      q: t(`${tr} faiz kararı ne zaman?`, `When is the next ${name} rate decision?`),
      a: t(`Sıradaki karar ${day}.`, `The next decision is on ${day}.`),
    });
    qa.push({
      q: t(`${tr} faiz kararı saat kaçta açıklanır?`, `What time is the ${name} rate decision announced?`),
      a: next.timeTbd
        ? t("Açıklama saati önceden duyurulmuyor.", "The announcement time is not published in advance.")
        : t(
            `Türkiye saatiyle ${formatTimeTrt(next.meetingAt)}.`,
            `${formatTimeTrt(next.meetingAt)} Turkey time.`,
          ),
    });
  }
  if (rate) {
    qa.push({
      q: t(`${tr} faiz oranı şu an yüzde kaç?`, `What is the current ${name} interest rate?`),
      a: t(
        `${bank.rateNameTr}: ${rate.text} (${rate.since} itibarıyla).`,
        `${bank.rateNameEn}: ${rate.text} (since ${rate.since}).`,
      ),
    });
  }
  return qa.length ? faqLd(qa) : undefined;
}
