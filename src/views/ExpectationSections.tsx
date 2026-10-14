import Link from "next/link";
import { RateOdds, type OddsRow } from "@/components/RateOdds";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { Callout, Card, SectionHeader, Stat, TableFrame, Th } from "@/components/ui";
import type { ExpectationPoint } from "@/lib/expectation-history";
import type { EcbSurveyExpectations, MarketExpectations, SurveyExpectations } from "@/lib/expectations";
import { fmtBp as bp, fmtPercent, INTL_LOCALE, L, localePath, type Lang } from "@/lib/i18n";
import { moveOdds } from "@/lib/implied-path";
import { formatDate, formatDateShort, monthLabel } from "@/lib/time";
import type { Meeting } from "@/lib/types";

/**
 * Fed dışı bankaların beklenti bölümleri (faiz olasılığı sayfası).
 *
 * İki farklı tür beklenti var ve okuyucu ikisini karıştırmamalı: BoE
 * piyasa fiyatlamasından türetilir (Fed gibi), TCMB ekonomistlere sorulan
 * bir ankettir. Her bölümün başlığı ve rozeti türünü söyler.
 */

function KindBadge({ kind, lang }: { kind: "market" | "survey"; lang: Lang }) {
  const t = L(lang);
  return (
    <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-xs font-normal text-accent">
      {kind === "market"
        ? t("piyasa fiyatlaması", "market pricing")
        : t("anket", "survey")}
    </span>
  );
}

export function BoeExpectations({
  data,
  history,
  lang,
}: {
  data: MarketExpectations;
  /** Toplantı kimliği → günlük beklentiler (data/history). */
  history?: Record<string, ExpectationPoint[]>;
  lang: Lang;
}) {
  const t = L(lang);
  const next = data.meetings[0];
  const trend = (history?.[next.meetingId] ?? []).slice(-90).map((p) => ({
    label: formatDateShort(p.date, lang),
    expected: p.rate,
  }));
  const odds = moveOdds(next.changeBp);
  const rows: OddsRow[] = [
    { direction: "up", label: t("25 bp artırım", "25 bp hike"), pct: odds.direction === "hike" ? odds.pct : 0 },
    { direction: "flat", label: t("Sabit", "Hold"), pct: odds.direction === "hold" ? 100 : 100 - odds.pct },
    { direction: "down", label: t("25 bp indirim", "25 bp cut"), pct: odds.direction === "cut" ? odds.pct : 0 },
  ];

  return (
    <section id="boe" className="scroll-mt-4">
      <Card>
        <SectionHeader
          title={t("BoE — Bank Rate beklentisi", "BoE — Bank Rate expectations")}
          description={t(
            `İngiltere Merkez Bankası'nın yayımladığı OIS faiz eğrisinden türetildi; eğri ${formatDate(data.asOf, lang)} tarihli. Güncel Bank Rate ${fmtPercent(data.currentRate, lang)}.`,
            `Derived from the OIS yield curve published by the Bank of England; curve dated ${formatDate(data.asOf, lang)}. Current Bank Rate ${fmtPercent(data.currentRate, lang)}.`,
          )}
        />
        <KindBadge kind="market" lang={lang} />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-sm text-muted">
              {t(
                `Sıradaki MPC kararı (${formatDate(next.meetingAt, lang)})`,
                `Next MPC decision (${formatDate(next.meetingAt, lang)})`,
              )}
            </div>
            <RateOdds rows={rows} lang={lang} />
          </div>
          <Stat
            label={t("Bu toplantıda fiyatlanan değişim", "Change priced for this meeting")}
            value={bp(next.changeBp)}
            tone={next.changeBp > 0 ? "text-hawk" : next.changeBp < 0 ? "text-dove" : "text-foreground"}
            note={t(
              `Toplantı sonrası beklenen faiz ${fmtPercent(next.impliedRate, lang)}`,
              `Expected rate after the meeting ${fmtPercent(next.impliedRate, lang)}`,
            )}
          />
        </div>

        <div className="mt-5">
          <TableFrame minWidth="30rem">
            <thead>
              <tr className="border-b border-border-strong text-left text-muted">
                <Th>{t("MPC toplantısı", "MPC meeting")}</Th>
                <Th align="right">{t("Beklenen Bank Rate", "Expected Bank Rate")}</Th>
                <Th align="right">{t("Toplantıda değişim", "Change at meeting")}</Th>
                <Th align="right">{t("Bugüne göre", "Versus today")}</Th>
              </tr>
            </thead>
            <tbody>
              {data.meetings.map((m) => {
                const total = Math.round((m.impliedRate - data.currentRate) * 100);
                return (
                  <tr key={m.meetingId} className="border-b border-border last:border-b-0">
                    <td className="tabular whitespace-nowrap px-4 py-2.5">{formatDateShort(m.meetingAt, lang)}</td>
                    <td className="tabular px-4 py-2.5 text-right font-semibold">
                      {fmtPercent(m.impliedRate, lang)}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-muted">{bp(m.changeBp)}</td>
                    <td className="tabular px-4 py-2.5 text-right text-muted">{bp(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableFrame>
        </div>

        {trend.length >= 5 && (
          <div className="mt-6">
            <h3 className="text-base font-semibold">
              {t(
                `${formatDate(next.meetingAt, lang)} toplantısı için beklentinin seyri`,
                `How the expectation for the ${formatDate(next.meetingAt, lang)} meeting has moved`,
              )}
            </h3>
            <p className="prose-width mt-1 text-sm text-muted">
              {t(
                `Son ${trend.length} piyasa gününde, bu toplantıdan sonra beklenen Bank Rate. Kesik çizgi bugünkü faiz.`,
                `The Bank Rate expected after this meeting over the last ${trend.length} market days. The dashed line is today's rate.`,
              )}
            </p>
            <div className="mt-3">
              <TimeSeriesChart
                data={trend}
                series={[{ key: "expected", name: t("Beklenen Bank Rate", "Expected Bank Rate"), color: "var(--accent)" }]}
                unit="rate"
                lang={lang}
                refLines={[{ y: data.currentRate, label: t("bugünkü faiz", "current rate"), color: "var(--muted)" }]}
              />
            </div>
          </div>
        )}

        <p className="prose-width mt-3 text-sm text-muted">
          {t(
            "Yöntem: her toplantıdan bir sonrakine kadar eğrinin ortalaması, o dönemde beklenen gecelik faizdir; bugün gerçekleşen gecelik faize (SONIA) göre farkı, toplantılarda beklenen değişimi verir. İhtimal, bu değişimin 25 baz puanlık adıma oranıdır (ör. +13 bp ≈ %52 ihtimalle artırım). Eğri yumuşatılmış olduğu ve vade primi ayrıştırılmadığı için rakamlar yaklaşıktır; uzak toplantılarda belirsizlik artar.",
            "Method: the average of the curve between one meeting and the next is the overnight rate expected for that period; its difference from today's actual overnight rate (SONIA) gives the change expected at each meeting. The probability is that change divided by a 25 basis point step (e.g. +13 bp ≈ 52% chance of a hike). Because the curve is smoothed and the term premium is not separated out, the figures are approximate; uncertainty grows for later meetings.",
          )}{" "}
          {t("Kaynak", "Source")}:{" "}
          <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
            Bank of England — Yield curves
          </a>
          .
        </p>
      </Card>
    </section>
  );
}

export function TcmbExpectations({
  data,
  currentRate,
  meetings,
  now,
  history,
  lang,
}: {
  data: SurveyExpectations;
  currentRate?: number;
  /** Gerçekleşen kararı göstermek için TCMB toplantıları. */
  meetings: Meeting[];
  now: Date;
  history?: Record<string, ExpectationPoint[]>;
  lang: Lang;
}) {
  const t = L(lang);
  const upcoming = data.meetings.find((e) => new Date(e.meetingAt) > now);
  const [y, m] = data.period.split("-").map(Number);
  const period = new Intl.DateTimeFormat(INTL_LOCALE[lang], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 15)));

  return (
    <section id="tcmb" className="scroll-mt-4">
      <Card>
        <SectionHeader
          title={t("TCMB — politika faizi beklentisi", "CBRT — policy rate expectations")}
          description={t(
            `TCMB Piyasa Katılımcıları Anketi, ${period}. Ekonomist ve piyasa katılımcılarının beklentilerinin ortalamasıdır; piyasa fiyatlaması değildir ve ayda bir yayımlanır.`,
            `CBRT Survey of Market Participants, ${period}. It is the average of economists' and market participants' expectations — not market pricing — and is published once a month.`,
          )}
        />
        <KindBadge kind="survey" lang={lang} />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {currentRate !== undefined && (
            <Stat label={t("Güncel politika faizi", "Current policy rate")} value={fmtPercent(currentRate, lang)} />
          )}
          {data.yearEnd !== undefined && (
            <Stat label={t("Yıl sonu beklentisi", "Year-end expectation")} value={fmtPercent(data.yearEnd, lang)} />
          )}
          {data.months12 !== undefined && (
            <Stat label={t("12 ay sonrası beklentisi", "12 months ahead")} value={fmtPercent(data.months12, lang)} />
          )}
        </div>

        <div className="mt-5">
          <TableFrame minWidth="30rem">
            <thead>
              <tr className="border-b border-border-strong text-left text-muted">
                <Th>{t("PPK toplantısı", "MPC meeting")}</Th>
                <Th align="right">{t("Anketteki beklenti", "Survey expectation")}</Th>
                <Th align="right">{t("Gerçekleşen / fark", "Actual / difference")}</Th>
              </tr>
            </thead>
            <tbody>
              {data.meetings.map((e) => {
                const meeting = meetings.find((x) => x.id === e.meetingId);
                const past = new Date(e.meetingAt) <= now;
                const diff =
                  currentRate !== undefined ? Math.round((e.expectedRate - currentRate) * 100) : undefined;
                return (
                  <tr key={e.meetingId} className="border-b border-border last:border-b-0">
                    <td className="tabular whitespace-nowrap px-4 py-2.5">{formatDateShort(e.meetingAt, lang)}</td>
                    <td className="tabular px-4 py-2.5 text-right font-semibold">
                      {fmtPercent(e.expectedRate, lang)}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-muted">
                      {past
                        ? meeting?.decisionRate !== undefined
                          ? t(`karar ${fmtPercent(meeting.decisionRate, lang)}`, `decided ${fmtPercent(meeting.decisionRate, lang)}`)
                          : t("karar bekleniyor", "awaiting data")
                        : diff !== undefined
                          ? t(`bugüne göre ${bp(diff)}`, `${bp(diff)} vs today`)
                          : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableFrame>
        </div>

        {upcoming && (
          <RoundsTable points={history?.[upcoming.meetingId] ?? []} meetingAt={upcoming.meetingAt} showOdds={false} lang={lang} />
        )}

        <p className="prose-width mt-3 text-sm text-muted">
          {t(
            "Anketteki \"ilk toplantı\", anket ayında yapılan ilk PPK'dır; anket o toplantıdan önce toplandığı için bu satır geçmişte kalmış olabilir — o durumda gerçekleşen karar yanında gösterilir.",
            "The survey's \"first meeting\" is the first MPC meeting in the survey month; because responses are collected before it, that row may already be in the past — in that case the actual decision is shown next to it.",
          )}{" "}
          {t("Kaynak", "Source")}:{" "}
          <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
            {t("TCMB — Piyasa Katılımcıları Anketi", "CBRT — Survey of Market Participants")}
          </a>{" "}
          (EVDS).
        </p>
      </Card>
    </section>
  );
}

export function EcbExpectations({
  data,
  currentRate,
  meetings,
  now,
  history,
  lang,
}: {
  data: EcbSurveyExpectations;
  currentRate?: number;
  meetings: Meeting[];
  now: Date;
  history?: Record<string, ExpectationPoint[]>;
  lang: Lang;
}) {
  const t = L(lang);
  // Anketin olasılık verdiği, henüz yapılmamış ilk toplantı.
  const next = data.meetings.find((m) => m.odds && new Date(m.meetingAt) > now);
  const rows: OddsRow[] | undefined = next?.odds && [
    { direction: "up", label: t("Artırım", "Hike"), pct: next.odds.hike },
    { direction: "flat", label: t("Sabit", "Hold"), pct: next.odds.hold },
    { direction: "down", label: t("İndirim", "Cut"), pct: next.odds.cut },
  ];

  return (
    <section id="ecb" className="scroll-mt-4">
      <Card>
        <SectionHeader
          title={t("ECB — mevduat faizi beklentisi", "ECB — deposit facility rate expectations")}
          description={t(
            `ECB'nin para analistleri anketi (Survey of Monetary Analysts), sonuçlar ${formatDate(data.publishedOn, lang)} tarihinde yayımlandı. Analistlerin beklentisidir, piyasa fiyatlaması değildir; her Yönetim Konseyi toplantısından önce yapılır.`,
            `The ECB Survey of Monetary Analysts, results published on ${formatDate(data.publishedOn, lang)}. It reflects analysts' expectations, not market pricing, and is run before each Governing Council meeting.`,
          )}
        />
        <KindBadge kind="survey" lang={lang} />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {next && rows && (
            <div>
              <div className="mb-2 text-sm text-muted">
                {t(
                  `Sıradaki karar (${formatDate(next.meetingAt, lang)}) için analistlerin ortalama olasılığı`,
                  `Analysts' average probability for the next decision (${formatDate(next.meetingAt, lang)})`,
                )}
              </div>
              <RateOdds rows={rows} lang={lang} />
            </div>
          )}
          {currentRate !== undefined && (
            <Stat label={t("Güncel mevduat faizi", "Current deposit facility rate")} value={fmtPercent(currentRate, lang)} />
          )}
        </div>

        <div className="mt-5">
          <TableFrame minWidth="30rem">
            <thead>
              <tr className="border-b border-border-strong text-left text-muted">
                <Th>{t("Toplantı", "Meeting")}</Th>
                <Th align="right">{t("Medyan beklenti", "Median expectation")}</Th>
                <Th align="right">{t("25.–75. yüzdelik", "25th–75th percentile")}</Th>
                <Th align="right">{t("Karar", "Actual")}</Th>
              </tr>
            </thead>
            <tbody>
              {data.meetings.map((e) => {
                const meeting = meetings.find((x) => x.id === e.meetingId);
                const past = new Date(e.meetingAt) <= now;
                return (
                  <tr key={e.meetingId} className="border-b border-border last:border-b-0">
                    <td className="tabular whitespace-nowrap px-4 py-2.5">{formatDateShort(e.meetingAt, lang)}</td>
                    <td className="tabular px-4 py-2.5 text-right font-semibold">{fmtPercent(e.median, lang)}</td>
                    <td className="tabular px-4 py-2.5 text-right text-muted">
                      {e.p25 === e.p75 ? fmtPercent(e.p25, lang) : `${fmtPercent(e.p25, lang)} – ${fmtPercent(e.p75, lang)}`}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-muted">
                      {past && meeting?.decisionRate !== undefined ? fmtPercent(meeting.decisionRate, lang) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableFrame>
        </div>

        {next && <RoundsTable points={history?.[next.meetingId] ?? []} meetingAt={next.meetingAt} showOdds lang={lang} />}

        <p className="prose-width mt-3 text-sm text-muted">
          {t(
            "Olasılıklar analistlerin her değişim büyüklüğüne verdiği ihtimallerin ortalamasıdır (indirim: −25 bp ve altı, sabit: 0 ve ±10 bp, artırım: +25 bp ve üstü). Anket toplantıdan önce yapılır, sonuçlar toplantıdan sonra yayımlanır; bu yüzden tablonun ilk satırı çoğunlukla geçmişte kalmıştır.",
            "Probabilities are the average of the odds analysts assign to each size of change (cut: −25 bp or more, hold: 0 and ±10 bp, hike: +25 bp or more). The survey is run before the meeting and the results are published after it, so the first row of the table is usually already in the past.",
          )}{" "}
          {t("Kaynak", "Source")}:{" "}
          <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
            ECB — Survey of Monetary Analysts
          </a>
          .
        </p>
      </Card>
    </section>
  );
}

export function OtherBanksNote({ lang }: { lang: Lang }) {
  const t = L(lang);
  return (
    <Callout title={t("BoJ ve RBA neden yok?", "Why not the BoJ and RBA?")}>
      {t(
        "Bu bankalar için piyasanın fiyatladığı olasılıklar vadeli işlem borsalarının lisanslı verisinden hesaplanıyor ve otomatik çekilmesi kullanım şartlarına aykırı; ücretsiz bir anket kaynağı da bulamadık. Yeniden yayımlanabilir bir kaynak bulduğumuzda eklenecek. Bu bankaların toplantı tarihleri ve güncel faizleri ",
        "For these banks, market-implied probabilities are computed from futures exchanges' licensed data, and fetching it automatically would breach their terms of use; we have not found a free survey source either. They will be added when we find a source that can be republished. Their meeting dates and current rates are on the ",
      )}
      <Link href={localePath(lang, "/takvim")} className="text-accent hover:underline">
        {t("takvim", "calendar")}
      </Link>
      {t(" sayfasında.", " page.")}
    </Callout>
  );
}

/**
 * Anket turları arasında bir toplantı için beklenti — anketler seyrek olduğu
 * için grafik yerine tablo. Bkz. data/history.
 */
function RoundsTable({
  points,
  meetingAt,
  showOdds,
  lang,
}: {
  points: ExpectationPoint[];
  meetingAt: string;
  showOdds: boolean;
  lang: Lang;
}) {
  const t = L(lang);
  const rows = points.filter((p) => p.round).slice(-6).reverse();
  if (rows.length < 2) return null;
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold">
        {t(
          `${formatDate(meetingAt, lang)} toplantısı için turlar arasında beklenti`,
          `Expectation for the ${formatDate(meetingAt, lang)} meeting across survey rounds`,
        )}
      </h3>
      <div className="mt-3">
        <TableFrame minWidth="26rem">
          <thead>
            <tr className="border-b border-border-strong text-left text-muted">
              <Th>{t("Anket", "Survey")}</Th>
              <Th align="right">{t("Beklenti", "Expectation")}</Th>
              {showOdds && <Th align="right">{t("Artırım / sabit / indirim", "Hike / hold / cut")}</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.date} className="border-b border-border last:border-b-0">
                <td className="tabular px-4 py-2.5">
                  {monthLabel(`${p.round}-15T12:00:00Z`, lang)}
                  {p.publishedOn && (
                    <span className="text-xs text-muted"> · {t("yayım", "published")} {formatDateShort(p.publishedOn, lang)}</span>
                  )}
                </td>
                <td className="tabular px-4 py-2.5 text-right font-semibold">{fmtPercent(p.rate, lang)}</td>
                {showOdds && (
                  <td className="tabular px-4 py-2.5 text-right text-muted">
                    {p.odds
                      ? `${fmtPercent(p.odds.hike, lang, 0)} / ${fmtPercent(p.odds.hold, lang, 0)} / ${fmtPercent(p.odds.cut, lang, 0)}`
                      : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </TableFrame>
      </div>
    </div>
  );
}
