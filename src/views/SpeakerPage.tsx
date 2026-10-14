import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BankTag, formatScore, ScoreBadge, scoreLabel, scoreToneClass } from "@/components/ScoreBadge";
import { Row, Rows, SectionHeader, Stat } from "@/components/ui";
import { BANKS, bankFullName, bankName } from "@/lib/banks";
import { getBankScoreSummaries, getSpeakers, getSpeakerSpeeches } from "@/lib/data/speeches";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { speechTitle } from "@/lib/speech-i18n";
import { formatDate } from "@/lib/time";

const speechCount = (n: number, lang: Lang) => (lang === "en" ? `${n} speech${n === 1 ? "" : "es"}` : `${n} konuşma`);

export async function speakerMetadata(lang: Lang, slug: string): Promise<Metadata> {
  const speaker = (await getSpeakers()).find((s) => s.slug === slug);
  if (!speaker) return {};
  const t = L(lang);
  const bank = bankName(BANKS[speaker.bankCode], lang);
  return {
    title: t(`${speaker.name}: konuşmalar ve şahin/güvercin skoru`, `${speaker.name}: speeches and hawk/dove score`),
    description: t(
      `${speaker.name} (${bank}) konuşmalarının Türkçe özetleri ve şahin/güvercin skorları. Arşivde ${speechCount(speaker.speechCount, lang)}.`,
      `Summaries and hawk/dove scores of speeches by ${speaker.name} (${bank}). ${speechCount(speaker.speechCount, lang)} in the archive.`,
    ),
    alternates: languageAlternates(lang, `/konusmaci/${slug}`),
  };
}

export async function SpeakerPage({ lang, slug }: { lang: Lang; slug: string }) {
  const [speakers, speeches, bankSummaries] = await Promise.all([
    getSpeakers(),
    getSpeakerSpeeches(slug),
    getBankScoreSummaries(),
  ]);
  const speaker = speakers.find((s) => s.slug === slug);
  if (!speaker) notFound();
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const bank = BANKS[speaker.bankCode];
  const bankAvg = bankSummaries.find((b) => b.bankCode === speaker.bankCode);
  const avg = speaker.averageScore;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <BankTag code={speaker.bankCode} lang={lang} />
          <span>{bankFullName(bank, lang)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{speaker.name}</h1>
        {/* Türkçe unvan yoksa İngilizcesi, dili belirtilerek. */}
        {(lang === "tr" ? (speaker.roleTr ?? speaker.roleEn) : speaker.roleEn) && (
          <p lang={lang === "tr" && speaker.roleTr ? "tr" : "en"} className="mt-1 text-muted">
            {lang === "tr" ? (speaker.roleTr ?? speaker.roleEn) : speaker.roleEn}
          </p>
        )}
        <p className="prose-width mt-2 text-muted">
          {t(
            `Arşivde ${speechCount(speaker.speechCount, lang)}; ${speaker.signalCount} tanesi para politikası sinyali taşıyor ve ortalamaya giriyor.`,
            `${speechCount(speaker.speechCount, lang)} in the archive; ${speaker.signalCount} carry a monetary policy signal and count towards the average.`,
          )}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          compact
          label={t("Konuşmacının ortalaması", "Speaker's average")}
          value={avg === undefined ? "—" : formatScore(avg, lang)}
          tone={avg === undefined ? undefined : scoreToneClass(avg)}
          note={avg === undefined ? t("politika sinyali yok", "no policy signal") : scoreLabel(avg, lang)}
        />
        {bankAvg && (
          <Stat
            compact
            label={t(`${bankName(bank, lang)} ortalaması`, `${bankName(bank, lang)} average`)}
            value={formatScore(bankAvg.averageScore, lang)}
            tone={scoreToneClass(bankAvg.averageScore)}
            note={speechCount(bankAvg.speechCount, lang)}
          />
        )}
      </div>
      {speaker.signalCount === 1 && (
        <p className="prose-width text-sm text-muted">
          {t(
            "Ortalama tek bir konuşmaya dayanıyor: bir eğilim değil, tek bir görüş.",
            "The average rests on a single speech: one view, not a trend.",
          )}
        </p>
      )}
      {speaker.signalCount === 0 && (
        <p className="prose-width text-sm text-muted">
          {t(
            "Bu konuşmacının arşivdeki konuşmaları para politikası duruşuna değinmiyor (düzenleme, denetim, ödeme sistemleri gibi konular); ortalama hesaplanmıyor.",
            "This speaker's speeches in the archive do not address the monetary policy stance (topics such as regulation, supervision or payment systems), so no average is calculated.",
          )}
        </p>
      )}

      <section>
        <SectionHeader title={t("Konuşmalar", "Speeches")} />
        <Rows>
          {speeches.map((s) => (
            <Row key={s.id}>
              <span className="tabular text-sm text-muted">{formatDate(s.speechDate, lang)}</span>
              <Link href={p(`/konusma/${s.id}`)} className="min-w-56 flex-1 hover:text-accent">
                {speechTitle(s, lang)}
              </Link>
              <ScoreBadge score={s.hawkDoveScore} hasPolicySignal={s.hasPolicySignal} lang={lang} />
            </Row>
          ))}
        </Rows>
      </section>

      <p className="prose-width text-sm text-muted">
        {t(
          "Skorlar her konuşma için bir dil modeliyle üretilir; herkesin ağırlığı eşittir.",
          "Scores are produced for each speech by a language model; everyone carries equal weight.",
        )}{" "}
        <Link href={p("/skor")} className="text-accent hover:underline">
          {t("Skor nasıl okunur?", "How to read the score")}
        </Link>
      </p>
    </div>
  );
}
