import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import {
  BankTag,
  ScoreBadge,
  formatScore,
  scoreLabel,
  scoreToneClass,
} from "@/components/ScoreBadge";
import { ScoringGap } from "@/components/ScoringGap";
import { Term } from "@/components/Term";
import { Card, Row, Rows, SectionHeader, TableFrame, Th } from "@/components/ui";
import { BANKS, bankName, CALENDAR_BANK_CODES } from "@/lib/banks";
import { getLatestStatementScores } from "@/lib/data/statements";
import {
  getBankScoreSummaries,
  getCoverage,
  getScoreTrend,
  getScoringStatus,
  getSpeeches,
  type BankScoreTrend,
} from "@/lib/data/speeches";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { speakerSlug } from "@/lib/speakers";
import { speechTitle } from "@/lib/speech-i18n";
import { formatDate, monthShortLabel } from "@/lib/time";

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
  // Son dört takvim ayı, bu ay dahil (YYYY-AA).
  const now = new Date();
  const months = [3, 2, 1, 0].map((k) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)).toISOString().slice(0, 7),
  );
  const [summaries, recent, coverage, status, trend, statements] = await Promise.all([
    getBankScoreSummaries(),
    getSpeeches({ scoredOnly: true, limit: 10 }),
    getCoverage(),
    getScoringStatus(),
    getScoreTrend(months),
    getLatestStatementScores(),
  ]);
  // Karar metni puanı olan ama skorlu konuşması olmayan banka (TCMB) da tabloda yer alır.
  const tableBanks = CALENDAR_BANK_CODES.filter((code) => summaries.some((s) => s.bankCode === code) || statements[code]);

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

      {tableBanks.length === 0 ? (
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
                <Th align="right">{t("Karar metni", "Statement")}</Th>
                {/* Telefonda altı sütun sığmıyor (390 px): sayı ve tarih gizlenir. */}
                <Th align="right" className="max-sm:hidden">
                  {t("Konuşma", "Speeches")}
                </Th>
                <Th align="right" className="max-sm:hidden">
                  {t("Son", "Latest")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {tableBanks.map((code) => {
                const s = summaries.find((x) => x.bankCode === code);
                const st = statements[code];
                return (
                  <tr key={code} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      <Link
                        href={p(`/banka/${code}`)}
                        className="inline-flex min-h-9 items-center text-accent hover:underline"
                      >
                        {bankName(BANKS[code], lang)}
                      </Link>
                    </th>
                    <td className="px-4 py-3">
                      {s ? (
                        <ScoreMeter score={s.averageScore} lang={lang} />
                      ) : (
                        <span className="text-xs text-muted">{t("skorlu konuşma yok", "no scored speeches")}</span>
                      )}
                    </td>
                    <td
                      className={`tabular px-4 py-3 text-right font-semibold ${s ? scoreToneClass(s.averageScore) : "text-muted"}`}
                    >
                      {s ? formatScore(s.averageScore, lang) : "—"}
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {st ? (
                        <Link
                          href={p(`/karar/${st.meetingId}`)}
                          className={`inline-flex min-h-9 items-center justify-end font-semibold hover:underline ${scoreToneClass(st.score)}`}
                        >
                          {formatScore(st.score, lang)}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-muted max-sm:hidden">
                      {s ? s.speechCount : 0}
                      {s && s.noSignalCount > 0 && <span className="opacity-70"> (+{s.noSignalCount})</span>}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-muted max-sm:hidden">
                      {s ? formatDate(s.latestDate, lang) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableFrame>
          <p className="prose-width mt-2 text-sm text-muted">
            {t(
              "Karar metni: bankanın en son resmî karar metninin aynı ölçekteki puanı — komitenin ortak sesi; skor ise üyelerin tek tek konuşmalarının ortalaması. Konuşma sütunundaki parantezli sayı, para politikası sinyali taşımadığı için ortalamaya girmeyen konuşmaları gösterir.",
              "Statement: the score of the bank's latest official policy statement on the same scale — the committee's collective voice; the score is the average of individual members' speeches. The number in brackets in the speeches column counts speeches left out of the average because they carry no monetary policy signal.",
            )}
          </p>
        </section>
      )}

      {trend.length > 0 && <Trend trend={trend} months={months} lang={lang} />}

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

/**
 * Banka başına aylık ortalama. Hücrede ortalamaya giren konuşma sayısı da
 * yazar: tek konuşmalık bir ay eğilim değil, tek bir görüştür.
 */
function Trend({ trend, months, lang }: { trend: BankScoreTrend[]; months: string[]; lang: Lang }) {
  const t = L(lang);
  return (
    <section>
      <SectionHeader
        title={t("Aylık seyir", "Month by month")}
        description={t(
          "Her ay, o ayın sinyal taşıyan konuşmalarının ortalaması ve kaç konuşmaya dayandığı. Tek konuşmalık bir ay eğilim değil, tek bir görüştür.",
          "For each month, the average of that month's speeches that carry a signal, and how many speeches it rests on. A month with a single speech is one view, not a trend.",
        )}
      />
      <TableFrame minWidth="30rem">
        <thead>
          <tr className="border-b border-border-strong text-left text-muted">
            <Th>{t("Banka", "Bank")}</Th>
            {/* Telefonda dört ay sütunu sığmıyor: en eski ay gizlenir. */}
            {months.map((m, i) => (
              <Th key={m} align="right" className={i === 0 ? "max-sm:hidden" : ""}>
                {monthShortLabel(`${m}-15T12:00:00Z`, lang)}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trend.map((b) => (
            <tr key={b.bankCode} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-4 py-3 text-left font-medium">
                {bankName(BANKS[b.bankCode], lang)}
              </th>
              {b.months.map((m, i) => (
                <td key={m.month} className={`tabular px-4 py-3 text-right ${i === 0 ? "max-sm:hidden" : ""}`}>
                  {m.average === undefined ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <>
                      <span className={`font-semibold ${scoreToneClass(m.average)}`}>
                        {formatScore(m.average, lang)}
                      </span>
                      <div className="whitespace-nowrap text-xs text-muted">
                        {lang === "en" ? `${m.count} speech${m.count === 1 ? "" : "es"}` : `${m.count} konuşma`}
                      </div>
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableFrame>
    </section>
  );
}

/** -10..+10 ölçeğini yatay çubukta konumlandırır. */
function ScoreMeter({ score, lang }: { score: number; lang: Lang }) {
  const pct = ((score + 10) / 20) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 w-full min-w-16 rounded-full bg-border sm:min-w-32">
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
        {lang === "en" ? (
          <>
            A{" "}
            <Term id="guvercin" lang={lang}>
              dovish
            </Term>{" "}
            stance leans towards rate cuts, a{" "}
            <Term id="sahin" lang={lang}>
              hawkish
            </Term>{" "}
            stance towards rate hikes. Speeches on regulation or supervision score 0 and are left out of the average —
            that means &quot;no signal&quot;, not &quot;balanced stance&quot;.
          </>
        ) : (
          <>
            <Term id="guvercin" lang={lang}>
              Güvercin
            </Term>{" "}
            duruş faiz indirimine,{" "}
            <Term id="sahin" lang={lang}>
              şahin
            </Term>{" "}
            duruş faiz artırımına eğilimi gösterir. Düzenleme veya denetim konulu konuşmalar 0 puan alır ve ortalamaya
            katılmaz — bu &quot;dengeli duruş&quot; değil &quot;sinyal yok&quot; demektir.
          </>
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
            "A committee that was at +6 a month ago and is at +4 today is turning more dovish, even if the number still looks hawkish. The month-by-month table above shows this change.",
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
            "Bir ay önce +6 olan bir komitenin bugün +4 olması, rakam hâlâ şahin görünse bile güvercinleşme anlamına gelir. Yukarıdaki aylık seyir tablosu bu değişimi gösterir.",
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
              <td className="px-4 py-3 leading-7 text-muted">
                {c.speakers.map((name, i) => (
                  <Fragment key={name}>
                    {i > 0 && ", "}
                    <Link
                      href={localePath(lang, `/konusmaci/${speakerSlug(name)}`)}
                      className="text-accent hover:underline"
                    >
                      {name}
                    </Link>
                  </Fragment>
                ))}
              </td>
              <td className="tabular px-4 py-3 text-right text-muted">{c.speechCount}</td>
            </tr>
          ))}
        </tbody>
      </TableFrame>
    </section>
  );
}
