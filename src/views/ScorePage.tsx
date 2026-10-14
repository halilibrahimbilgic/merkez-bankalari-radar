import type { Metadata } from "next";
import Link from "next/link";
import {
  BankTag,
  ScoreBadge,
  formatScore,
  scoreLabel,
  scoreToneClass,
} from "@/components/ScoreBadge";
import { ScoringGap } from "@/components/ScoringGap";
import { Card, Row, Rows, SectionHeader, TableFrame, Th } from "@/components/ui";
import { BANKS, bankName } from "@/lib/banks";
import {
  getBankScoreSummaries,
  getCoverage,
  getScoringStatus,
  getSpeeches,
} from "@/lib/data/speeches";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { speechTitle } from "@/lib/speech-i18n";
import { formatDate } from "@/lib/time";

export function scoreMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Şahin/Güvercin skoru", "Hawk/Dove score"),
    description: t(
      "Merkez bankalarının güncel şahin/güvercin eğilimi — konuşmalardan hesaplanan karşılaştırmalı skor, kapsam ve yöntem.",
      "Central banks' current hawkish/dovish tilt — a comparative score computed from speeches, with coverage and method.",
    ),
    alternates: languageAlternates(lang, "/skor"),
  };
}

export async function ScorePage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const [summaries, recent, coverage, status] = await Promise.all([
    getBankScoreSummaries(),
    getSpeeches({ scoredOnly: true, limit: 10 }),
    getCoverage(),
    getScoringStatus(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("Şahin/Güvercin skoru", "Hawk/Dove score")}
        </h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Her bankanın skoru, arşivdeki konuşmalarından para politikası sinyali taşıyanların ortalamasıdır. Ölçek -10 (çok güvercin) ile +10 (çok şahin) arasındadır.",
            "Each bank's score is the average of the speeches in the archive that carry a monetary policy signal. The scale runs from -10 (very dovish) to +10 (very hawkish).",
          )}
        </p>
      </header>

      <Scale lang={lang} />

      <ScoringGap status={status} context="averages" lang={lang} />

      {summaries.length === 0 ? (
        <Card>
          <p className="prose-width text-muted">
            {t(
              "Henüz skorlanmış konuşma yok. Skorlar günlük veri işinde üretilir; yeni konuşmalar bir sonraki koşuda skorlanır.",
              "No scored speeches yet. Scores are produced by the daily data job; new speeches are scored in the next run.",
            )}
          </p>
        </Card>
      ) : (
        <section>
          <SectionHeader title={t("Bir bakışta komite skorları", "Committee scores at a glance")} />
          <TableFrame minWidth="36rem">
            <thead>
              <tr className="border-b border-border-strong text-left text-muted">
                <Th>{t("Banka", "Bank")}</Th>
                <Th>{t("Eğilim", "Tilt")}</Th>
                <Th align="right">{t("Skor", "Score")}</Th>
                <Th align="right">{t("Konuşma", "Speeches")}</Th>
                <Th align="right">{t("Son", "Latest")}</Th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.bankCode} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    <Link
                      href={p(`/banka/${s.bankCode}`)}
                      className="inline-flex min-h-9 items-center text-accent hover:underline"
                    >
                      {bankName(BANKS[s.bankCode], lang)}
                    </Link>
                  </th>
                  <td className="px-4 py-3">
                    <ScoreMeter score={s.averageScore} lang={lang} />
                  </td>
                  <td
                    className={`tabular px-4 py-3 text-right font-semibold ${scoreToneClass(s.averageScore)}`}
                  >
                    {formatScore(s.averageScore, lang)}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-muted">
                    {s.speechCount}
                    {s.noSignalCount > 0 && <span className="opacity-70"> (+{s.noSignalCount})</span>}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-muted">
                    {formatDate(s.latestDate, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
          <p className="prose-width mt-2 text-sm text-muted">
            {t(
              "Konuşma sütunundaki parantezli sayı, para politikası sinyali taşımadığı için ortalamaya girmeyen konuşmaları gösterir.",
              "The number in brackets in the speeches column counts speeches left out of the average because they carry no monetary policy signal.",
            )}
          </p>
        </section>
      )}

      <HowToRead lang={lang} />

      {recent.length > 0 && (
        <section>
          <SectionHeader title={t("Son skorlanan konuşmalar", "Latest scored speeches")} />
          <Rows>
            {recent.map((s) => (
              <Row key={s.id}>
                <BankTag code={s.bankCode} lang={lang} />
                <Link href={p(`/konusma/${s.id}`)} className="min-w-56 flex-1 hover:text-accent">
                  {s.speakerName} — {speechTitle(s, lang)}
                </Link>
                <ScoreBadge score={s.hawkDoveScore} hasPolicySignal={s.hasPolicySignal} lang={lang} />
              </Row>
            ))}
          </Rows>
        </section>
      )}

      {coverage.length > 0 && <Coverage coverage={coverage} lang={lang} />}
    </div>
  );
}

/** -10..+10 ölçeğini yatay çubukta konumlandırır. */
function ScoreMeter({ score, lang }: { score: number; lang: Lang }) {
  const pct = ((score + 10) / 20) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 w-full min-w-32 rounded-full bg-border">
        <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-muted opacity-50" />
        <div
          className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>
      <span className={`whitespace-nowrap text-xs ${scoreToneClass(score)}`}>
        {scoreLabel(score, lang)}
      </span>
    </div>
  );
}

function Scale({ lang }: { lang: Lang }) {
  const t = L(lang);
  return (
    <Card pad="tight" className="text-sm">
      <div className="flex items-center justify-between text-muted">
        <span className="font-medium text-dove">-10 {t("çok güvercin", "very dovish")}</span>
        <span>0 {t("nötr", "neutral")}</span>
        <span className="font-medium text-hawk">+10 {t("çok şahin", "very hawkish")}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gradient-to-r from-dove via-border to-hawk" />
      <p className="prose-width mt-3 text-muted">
        {t(
          "Güvercin duruş faiz indirimine, şahin duruş faiz artırımına eğilimi gösterir. Düzenleme veya denetim konulu konuşmalar 0 puan alır ve ortalamaya katılmaz — bu \"dengeli duruş\" değil \"sinyal yok\" demektir.",
          "A dovish stance leans towards rate cuts, a hawkish stance towards rate hikes. Speeches on regulation or supervision score 0 and are left out of the average — that means \"no signal\", not \"balanced stance\".",
        )}
      </p>
    </Card>
  );
}

function HowToRead({ lang }: { lang: Lang }) {
  const t = L(lang);
  const items: [string, string][] =
    lang === "en"
      ? [
          [
            "The score is a summary, not a verdict.",
            "A single number cannot carry the context of a speech or the speaker's caveats. Read the rationale next to the score and, if possible, the source text.",
          ],
          [
            "Direction says more than level.",
            "A committee that was at +6 a month ago and is at +4 today is turning more dovish, even if the number still looks hawkish. As the archive grows we will show this change separately.",
          ],
          [
            "Everyone currently carries equal weight.",
            "The average makes no distinction for voting rights, seniority or chairmanship; a regional Fed president's speech counts as much as the chair's. Yet the chair's stance sets the committee's centre of gravity — so in periods with few speeches the average can mislead.",
          ],
          [
            "The sample is small.",
            "Our source is a feed that only returns recent speeches; the archive grows as the daily job runs. For banks with a single-digit number of speeches, the average is heavily influenced by any one speech.",
          ],
        ]
      : [
          [
            "Skor bir özettir, hüküm değil.",
            "Tek bir sayı, konuşmanın bağlamını ve konuşmacının çekincelerini taşıyamaz. Skorun yanındaki gerekçeyi ve mümkünse kaynak metni okuyun.",
          ],
          [
            "Yön, seviyeden daha çok şey söyler.",
            "Bir ay önce +6 olan bir komitenin bugün +4 olması, rakam hâlâ şahin görünse bile güvercinleşme anlamına gelir. Arşiv biriktikçe bu değişimi ayrıca göstereceğiz.",
          ],
          [
            "Herkesin ağırlığı şu an eşit.",
            "Ortalamayı alırken oy hakkı, kıdem veya başkanlık ayrımı yapmıyoruz; bir bölge Fed başkanının konuşması ile başkanınki aynı ağırlıkta. Oysa başkanın duruşu komitenin ağırlık merkezini belirler — bu yüzden az sayıda konuşmanın olduğu dönemlerde ortalama yanıltıcı olabilir.",
          ],
          [
            "Örneklem küçük.",
            "Kaynağımız yalnızca son konuşmaları veren bir beslemedir; arşiv günlük iş çalıştıkça birikir. Konuşma sayısı tek haneli olan bankalarda ortalama tek bir konuşmadan güçlü etkilenir.",
          ],
        ];

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{t("Endeksi nasıl okumalı", "How to read the index")}</h2>
      <div className="prose-width space-y-3 text-muted">
        {items.map(([lead, body]) => (
          <p key={lead}>
            <strong className="text-foreground">{lead}</strong> {body}
          </p>
        ))}
      </div>
    </section>
  );
}

function Coverage({
  coverage,
  lang,
}: {
  coverage: { bankCode: keyof typeof BANKS; speakers: string[]; speechCount: number }[];
  lang: Lang;
}) {
  const t = L(lang);
  return (
    <section>
      <SectionHeader
        title={t("Kapsam", "Coverage")}
        description={t(
          "Arşivde fiilen bulunan konuşmacılar. Bu bir hedef liste değil, şu ana kadar toplananın dökümüdür.",
          "Speakers actually present in the archive. This is not a target list but a record of what has been collected so far.",
        )}
      />
      <TableFrame minWidth="32rem">
        <thead>
          <tr className="border-b border-border-strong text-left text-muted">
            <Th>{t("Banka", "Bank")}</Th>
            <Th>{t("İzlenen konuşmacılar", "Speakers covered")}</Th>
            <Th align="right">{t("Konuşma", "Speeches")}</Th>
          </tr>
        </thead>
        <tbody>
          {coverage.map((c) => (
            <tr key={c.bankCode} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-4 py-3 text-left font-medium">
                {bankName(BANKS[c.bankCode], lang)}
              </th>
              <td className="px-4 py-3 text-muted">{c.speakers.join(", ")}</td>
              <td className="tabular px-4 py-3 text-right text-muted">{c.speechCount}</td>
            </tr>
          ))}
        </tbody>
      </TableFrame>
    </section>
  );
}
