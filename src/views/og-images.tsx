import { notFound } from "next/navigation";
import { formatScore, scoreLabel } from "@/components/ScoreBadge";
import { BANKS, bankCountry, bankFullName, bankName, bankRateName, getBank } from "@/lib/banks";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import { formatCurrentRate, getCurrentRate } from "@/lib/data/rates";
import { getBankScoreSummaries, getSpeech } from "@/lib/data/speeches";
import { getDecisionView } from "@/lib/data/decisions";
import { decisionSentence, formatExpectedRate } from "@/lib/decision-format";
import { surpriseText } from "@/components/SurpriseBadge";
import { L, type Lang } from "@/lib/i18n";
import { BANK_HEX, renderOgCard, scoreHex, type OgRow } from "@/lib/og";
import { speechTitle } from "@/lib/speech-i18n";
import { formatDate, formatTimeTrt } from "@/lib/time";

/**
 * Paylaşım görselleri — iki dilin opengraph-image.tsx dosyaları bunları
 * çağırır. Görsel, paylaşılan sayfanın dilinde olmalı: İngilizce bir
 * bağlantının Türkçe kartla açılması ilk izlenimde "yanlış site" dedirtir.
 */

export async function homeOgImage(lang: Lang) {
  const t = L(lang);
  const upcoming = (await getUpcomingMeetings()).slice(0, 3);
  return renderOgCard({
    eyebrow: t("Merkez bankası faiz kararları", "Central bank rate decisions"),
    title: t(
      "Fed, ECB, TCMB, BoE, BoJ ve RBA — Türkiye saatiyle",
      "Fed, ECB, CBRT, BoE, BoJ and RBA — in Turkey time",
    ),
    footer: "faizradar.com",
    rows: upcoming.map((m) => ({
      label: bankName(BANKS[m.bankCode], lang),
      dot: BANK_HEX[m.bankCode],
      value: m.timeTbd
        ? formatDate(m.meetingAt, lang)
        : `${formatDate(m.meetingAt, lang)} · ${formatTimeTrt(m.meetingAt)}`,
    })),
  });
}

export async function bankOgImage(lang: Lang, code: string) {
  const bank = getBank(code);
  if (!bank) notFound();
  const t = L(lang);

  const [next] = await getUpcomingMeetings({ bankCode: bank.code });
  const rate = await getCurrentRate(bank.code);
  const score = (await getBankScoreSummaries()).find((s) => s.bankCode === bank.code);

  const rows: OgRow[] = [];
  if (rate) rows.push({ label: bankRateName(bank, lang), value: formatCurrentRate(rate, lang) });
  if (next) {
    rows.push({
      label: t("Sıradaki karar", "Next decision"),
      value: next.timeTbd
        ? formatDate(next.meetingAt, lang)
        : `${formatDate(next.meetingAt, lang)} · ${formatTimeTrt(next.meetingAt)} TRT`,
    });
  }
  if (score) {
    rows.push({
      label: t("Konuşmaların tonu", "Tone of speeches"),
      value: `${formatScore(score.averageScore, lang)} (${scoreLabel(score.averageScore, lang)})`,
      valueColor: scoreHex(score.averageScore),
    });
  }

  return renderOgCard({
    eyebrow: `${bankFullName(bank, lang)} · ${bankCountry(bank, lang)}`,
    eyebrowColor: BANK_HEX[bank.code],
    title: t(`${bank.nameTr} faiz kararı`, `${bank.shortEn} rate decision`),
    rows,
    footer: t("faizradar.com · Türkiye saatiyle", "faizradar.com · Turkey time"),
  });
}

export async function speechOgImage(lang: Lang, id: string) {
  const speech = await getSpeech(id);
  if (!speech) notFound();
  const t = L(lang);

  const rows: OgRow[] = [{ label: t("Konuşmacı", "Speaker"), value: speech.speakerName }];
  if (speech.hawkDoveScore !== undefined) {
    // Sinyalsiz konuşmanın 0'ı "nötr" değildir (ARCHITECTURE.md §4).
    rows.push(
      speech.hasPolicySignal === false
        ? {
            label: t("Şahin/güvercin", "Hawk/dove"),
            value: t("para politikası sinyali yok", "no monetary policy signal"),
          }
        : {
            label: t("Şahin/güvercin", "Hawk/dove"),
            value: `${formatScore(speech.hawkDoveScore, lang)} (${scoreLabel(speech.hawkDoveScore, lang)})`,
            valueColor: scoreHex(speech.hawkDoveScore),
          },
    );
  }

  return renderOgCard({
    eyebrow: `${bankName(BANKS[speech.bankCode], lang)} · ${formatDate(speech.speechDate, lang)}`,
    eyebrowColor: BANK_HEX[speech.bankCode],
    title: speechTitle(speech, lang),
    rows,
    footer: t("Türkçe özet · faizradar.com", "Summary and score · faizradar.com"),
  });
}

export async function decisionOgImage(lang: Lang, id: string) {
  const view = await getDecisionView(id);
  if (!view) notFound();
  const t = L(lang);
  const m = view.meeting;
  const e = view.expectation;
  const rows: OgRow[] = [];
  if (e) {
    rows.push({
      label: t("Karardan önceki beklenti", "Expected before"),
      value: formatExpectedRate(m.bankCode, e.point.rate, lang),
    });
    rows.push({
      label: t("Sonuç", "Outcome"),
      value: surpriseText(e.surprise.label, lang),
      valueColor: e.surprise.label === "in-line" ? undefined : scoreHex(e.surprise.bp),
    });
  }
  const tone = view.statement?.summary?.tone;
  if (tone) {
    rows.push({
      label: t("Metnin tonu", "Statement tone"),
      value: {
        "more-hawkish": t("daha şahin", "more hawkish"),
        "more-dovish": t("daha güvercin", "more dovish"),
        "little-change": t("büyük ölçüde aynı", "largely unchanged"),
        mixed: t("karışık", "mixed"),
      }[tone],
      valueColor: tone === "more-hawkish" ? scoreHex(1) : tone === "more-dovish" ? scoreHex(-1) : undefined,
    });
  }
  return renderOgCard({
    eyebrow: `${bankName(BANKS[m.bankCode], lang)} · ${formatDate(m.meetingAt, lang)}`,
    eyebrowColor: BANK_HEX[m.bankCode],
    title: decisionSentence(m, lang),
    rows,
    footer: t("Beklenti ve sonuç · faizradar.com", "Expectation vs outcome · faizradar.com"),
  });
}
