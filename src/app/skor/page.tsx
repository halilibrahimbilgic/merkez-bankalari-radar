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
import { getBankScoreSummaries, getSpeeches } from "@/lib/data/speeches";
import { formatDateTr } from "@/lib/time";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Şahin/Güvercin skoru",
  description:
    "Merkez bankalarının güncel şahin/güvercin eğilimi — konuşmalardan hesaplanan karşılaştırmalı skor.",
};

export default async function ScorePage() {
  const summaries = await getBankScoreSummaries();
  const recent = await getSpeeches({ scoredOnly: true, limit: 10 });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Şahin/Güvercin skoru</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Her bankanın skoru, arşivdeki konuşmalarının ortalamasıdır. Ölçek -10
          (çok güvercin) ile +10 (çok şahin) arasındadır.
        </p>
      </header>

      <Scale />

      {summaries.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-muted">
          Henüz skorlanmış konuşma yok.{" "}
          <code className="rounded bg-accent-soft px-1 text-accent">
            npm run score:speeches
          </code>{" "}
          komutunu çalıştırın.
        </p>
      ) : (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Bankalara göre</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {summaries.map((s) => (
              <li
                key={s.bankCode}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 last:border-b-0"
              >
                <Link
                  href={`/banka/${s.bankCode}`}
                  className="min-w-14 font-semibold text-accent hover:underline"
                >
                  {BANKS[s.bankCode].nameTr}
                </Link>
                <ScoreMeter score={s.averageScore} />
                <div className="text-sm text-muted tabular">
                  {s.speechCount} konuşma · son {formatDateTr(s.latestDate)}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            Konuşma sayısı az olan bankalarda ortalama tek bir konuşmadan güçlü
            etkilenir — sayıyı da birlikte okuyun.
          </p>
        </section>
      )}

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
    </div>
  );
}

/** -10..+10 ölçeğini yatay çubukta konumlandırır. */
function ScoreMeter({ score }: { score: number }) {
  const pct = ((score + 10) / 20) * 100;
  return (
    <div className="flex min-w-56 flex-1 items-center gap-3">
      <div className="relative h-2 flex-1 rounded-full bg-border">
        <div
          className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
        <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-muted opacity-50" />
      </div>
      <span className={`min-w-28 text-sm tabular font-semibold ${scoreToneClass(score)}`}>
        {formatScore(score)} <span className="font-normal">({scoreLabelTr(score)})</span>
      </span>
    </div>
  );
}

function Scale() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-sm">
      <div className="flex items-center justify-between text-muted">
        <span className="text-dove font-medium">-10 çok güvercin</span>
        <span>0 nötr</span>
        <span className="text-hawk font-medium">+10 çok şahin</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gradient-to-r from-dove via-border to-hawk" />
      <p className="mt-3 text-muted">
        Güvercin duruş faiz indirimine, şahin duruş faiz artırımına eğilimi
        gösterir. Para politikası sinyali taşımayan konuşmalar 0 puan alır.
      </p>
    </div>
  );
}
