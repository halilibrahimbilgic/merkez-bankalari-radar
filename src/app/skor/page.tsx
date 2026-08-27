import type { Metadata } from "next";
import Link from "next/link";
import {
  BankTag,
  ScoreBadge,
  formatScore,
  scoreLabelTr,
  scoreToneClass,
} from "@/components/ScoreBadge";
import { BANKS } from "@/lib/banks";
import {
  getBankScoreSummaries,
  getCoverage,
  getScoringStatus,
  getSpeeches,
} from "@/lib/data/speeches";
import { ScoringGap } from "@/components/ScoringGap";
import { formatDateTr } from "@/lib/time";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Şahin/Güvercin skoru",
  description:
    "Merkez bankalarının güncel şahin/güvercin eğilimi — konuşmalardan hesaplanan karşılaştırmalı skor, kapsam ve yöntem.",
};

export default async function ScorePage() {
  const [summaries, recent, coverage, status] = await Promise.all([
    getBankScoreSummaries(),
    getSpeeches({ scoredOnly: true, limit: 10 }),
    getCoverage(),
    getScoringStatus(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Şahin/Güvercin skoru</h1>
        <p className="prose-width mt-2 text-muted">
          Her bankanın skoru, arşivdeki konuşmalarından para politikası sinyali
          taşıyanların ortalamasıdır. Ölçek -10 (çok güvercin) ile +10 (çok
          şahin) arasındadır.
        </p>
      </header>

      <Scale />

      <ScoringGap status={status} context="averages" />

      {summaries.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-muted">
          Henüz skorlanmış konuşma yok. Skorlama elle yapılır; toplu iş için
          bir Anthropic API anahtarı ve bakiyesi gerekir.
        </p>
      ) : (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Bir bakışta komite skorları</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Banka
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Eğilim
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Skor
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Konuşma
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Son
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.bankCode} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      <Link
                        href={`/banka/${s.bankCode}`}
                        className="inline-flex min-h-9 items-center text-accent hover:underline"
                      >
                        {BANKS[s.bankCode].nameTr}
                      </Link>
                    </th>
                    <td className="px-4 py-3">
                      <ScoreMeter score={s.averageScore} />
                    </td>
                    <td
                      className={`tabular px-4 py-3 text-right font-semibold ${scoreToneClass(s.averageScore)}`}
                    >
                      {formatScore(s.averageScore)}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-muted">
                      {s.speechCount}
                      {s.noSignalCount > 0 && (
                        <span className="opacity-70"> (+{s.noSignalCount})</span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-muted">
                      {formatDateTr(s.latestDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="prose-width mt-2 text-sm text-muted">
            Konuşma sütunundaki parantezli sayı, para politikası sinyali
            taşımadığı için ortalamaya girmeyen konuşmaları gösterir.
          </p>
        </section>
      )}

      <HowToRead />

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Son skorlanan konuşmalar</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {recent.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-b-0"
              >
                <BankTag code={s.bankCode} />
                <Link href={`/konusma/${s.id}`} className="flex-1 hover:text-accent">
                  {s.speakerName} — {s.title}
                </Link>
                <ScoreBadge score={s.hawkDoveScore} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {coverage.length > 0 && <Coverage coverage={coverage} />}
    </div>
  );
}

/** -10..+10 ölçeğini yatay çubukta konumlandırır. */
function ScoreMeter({ score }: { score: number }) {
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
        {scoreLabelTr(score)}
      </span>
    </div>
  );
}

function Scale() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-sm">
      <div className="flex items-center justify-between text-muted">
        <span className="font-medium text-dove">-10 çok güvercin</span>
        <span>0 nötr</span>
        <span className="font-medium text-hawk">+10 çok şahin</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gradient-to-r from-dove via-border to-hawk" />
      <p className="prose-width mt-3 text-muted">
        Güvercin duruş faiz indirimine, şahin duruş faiz artırımına eğilimi
        gösterir. Düzenleme veya denetim konulu konuşmalar 0 puan alır ve
        ortalamaya katılmaz — bu &quot;dengeli duruş&quot; değil &quot;sinyal
        yok&quot; demektir.
      </p>
    </div>
  );
}

function HowToRead() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Endeksi nasıl okumalı</h2>
      <div className="prose-width space-y-3 text-muted">
        <p>
          <strong className="text-foreground">Skor bir özettir, hüküm değil.</strong>{" "}
          Tek bir sayı, konuşmanın bağlamını ve konuşmacının çekincelerini
          taşıyamaz. Skorun yanındaki gerekçeyi ve mümkünse kaynak metni okuyun.
        </p>
        <p>
          <strong className="text-foreground">Yön, seviyeden daha çok şey söyler.</strong>{" "}
          Bir ay önce +6 olan bir komitenin bugün +4 olması, rakam hâlâ şahin
          görünse bile güvercinleşme anlamına gelir. Arşiv biriktikçe bu
          değişimi ayrıca göstereceğiz.
        </p>
        <p>
          <strong className="text-foreground">Herkesin ağırlığı şu an eşit.</strong>{" "}
          Ortalamayı alırken oy hakkı, kıdem veya başkanlık ayrımı yapmıyoruz;
          bir bölge Fed başkanının konuşması ile başkanınki aynı ağırlıkta.
          Oysa başkanın duruşu komitenin ağırlık merkezini belirler — bu yüzden
          az sayıda konuşmanın olduğu dönemlerde ortalama yanıltıcı olabilir.
        </p>
        <p>
          <strong className="text-foreground">Örneklem küçük.</strong> Kaynağımız
          yalnızca son konuşmaları veren bir beslemedir; arşiv günlük iş
          çalıştıkça birikir. Konuşma sayısı tek haneli olan bankalarda ortalama
          tek bir konuşmadan güçlü etkilenir.
        </p>
      </div>
    </section>
  );
}

function Coverage({
  coverage,
}: {
  coverage: { bankCode: keyof typeof BANKS; speakers: string[]; speechCount: number }[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Kapsam</h2>
      <p className="prose-width mb-3 text-sm text-muted">
        Arşivde fiilen bulunan konuşmacılar. Bu bir hedef liste değil, şu ana
        kadar toplananın dökümüdür.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Banka
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                İzlenen konuşmacılar
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Konuşma
              </th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((c) => (
              <tr key={c.bankCode} className="border-b border-border last:border-b-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {BANKS[c.bankCode].nameTr}
                </th>
                <td className="px-4 py-3 text-muted">{c.speakers.join(", ")}</td>
                <td className="tabular px-4 py-3 text-right text-muted">
                  {c.speechCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
