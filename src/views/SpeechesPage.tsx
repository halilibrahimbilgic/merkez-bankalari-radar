import type { Metadata } from "next";
import Link from "next/link";
import { BankFilter } from "@/components/BankFilter";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import { ScoringGap } from "@/components/ScoringGap";
import { BANKS } from "@/lib/banks";
import { getBankCodesWithSpeeches, getScoringStatus, getSpeeches } from "@/lib/data/speeches";
import { bankFilterPath } from "@/lib/filter-paths";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { speakerSlug } from "@/lib/speakers";
import { speechSummary, speechTitle } from "@/lib/speech-i18n";
import { formatDate } from "@/lib/time";
import type { BankCode } from "@/lib/types";

export function speechesMetadata(lang: Lang, bankCode?: BankCode): Metadata {
  const t = L(lang);
  if (bankCode) {
    const bank = BANKS[bankCode];
    return {
      title: t(`${bank.nameTr} konuşmaları: özet ve şahin/güvercin skoru`, `${bank.shortEn} speeches: summaries and hawk/dove score`),
      description: t(
        `${bank.fullTr} yetkililerinin konuşmaları — Türkçe özet ve şahin/güvercin skoru ile.`,
        `Speeches by ${bank.nameEn} policymakers — with summaries and a hawk/dove score.`,
      ),
      alternates: languageAlternates(lang, bankFilterPath("/konusmalar", bankCode)),
    };
  }
  return {
    title: t("Konuşma arşivi", "Speech archive"),
    description: t(
      "Merkez bankası yetkililerinin konuşmaları — Türkçe özet ve şahin/güvercin skoru ile.",
      "Speeches by central bank policymakers — with summaries and a hawk/dove score.",
    ),
    alternates: languageAlternates(lang, "/konusmalar"),
  };
}

export async function SpeechesPage({
  lang,
  bankCode,
}: {
  lang: Lang;
  bankCode?: BankCode;
}) {
  const t = L(lang);

  const speeches = await getSpeeches({ bankCode });
  const availableCodes = await getBankCodesWithSpeeches();
  const status = await getScoringStatus();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Konuşma arşivi", "Speech archive")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "BIS arşivinden derlenen merkez bankası konuşmaları. Konuşma metinleri ve Türkçe özet ile şahin/güvercin skoru günlük olarak otomatik üretilir; en yeni kayıtlar bir sonraki koşuya kadar skorsuz kalabilir.",
            "Central bank speeches compiled from the BIS archive. Speech texts, summaries and the hawk/dove score are produced automatically every day; the newest entries may stay unscored until the next run.",
          )}
        </p>
      </header>

      <ScoringGap status={status} context="archive" lang={lang} />

      <BankFilter
        basePath={localePath(lang, "/konusmalar")}
        active={bankCode}
        availableCodes={availableCodes}
        lang={lang}
      />

      {speeches.length === 0 ? (
        <p className="card p-5 text-muted">{t("Bu filtre için konuşma yok.", "No speeches for this filter.")}</p>
      ) : (
        <ul className="space-y-3">
          {speeches.map((s) => {
            const summary = speechSummary(s, lang);
            return (
              <li key={s.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <BankTag code={s.bankCode} lang={lang} />
                  <span className="tabular">{formatDate(s.speechDate, lang)}</span>
                  <span>·</span>
                  <Link
                    href={localePath(lang, `/konusmaci/${speakerSlug(s.speakerName)}`)}
                    className="hover:text-accent hover:underline"
                  >
                    {s.speakerName}
                  </Link>
                  <span className="ml-auto">
                    <ScoreBadge score={s.hawkDoveScore} hasPolicySignal={s.hasPolicySignal} lang={lang} />
                  </span>
                </div>
                <h2 className="mt-2 font-medium">
                  <Link href={localePath(lang, `/konusma/${s.id}`)} className="hover:text-accent">
                    {speechTitle(s, lang)}
                  </Link>
                </h2>
                {summary && (
                  <p lang={summary.lang} className="mt-1 line-clamp-3 text-sm text-muted">
                    {summary.text}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
