import type { Metadata } from "next";
import Link from "next/link";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import { BankFilter } from "@/components/BankFilter";
import { isBankCode } from "@/lib/banks";
import { getBankCodesWithSpeeches, getSpeeches } from "@/lib/data/speeches";
import { formatDateTr } from "@/lib/time";
import type { BankCode } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Konuşma arşivi",
  description:
    "Merkez bankası yetkililerinin konuşmaları — Türkçe özet ve şahin/güvercin skoru ile.",
};

export default async function SpeechesPage({
  searchParams,
}: PageProps<"/konusmalar">) {
  const params = await searchParams;
  const raw = typeof params.banka === "string" ? params.banka : undefined;
  const bankCode: BankCode | undefined = raw && isBankCode(raw) ? raw : undefined;

  const speeches = await getSpeeches({ bankCode });
  const availableCodes = await getBankCodesWithSpeeches();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Konuşma arşivi</h1>
        <p className="mt-2 max-w-2xl text-muted">
          BIS arşivinden derlenen merkez bankası konuşmaları. Her konuşma Türkçe
          özetlenip -10 (çok güvercin) ile +10 (çok şahin) arasında puanlanır.
        </p>
      </header>

      <BankFilter
        basePath="/konusmalar"
        active={bankCode}
        availableCodes={availableCodes}
      />

      {speeches.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-muted">
          Bu filtre için konuşma yok.{" "}
          <code className="rounded bg-accent-soft px-1 text-accent">
            npm run fetch:speeches
          </code>{" "}
          ile arşivi doldurun.
        </p>
      ) : (
        <ul className="space-y-3">
          {speeches.map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <BankTag code={s.bankCode} />
                <span className="tabular">{formatDateTr(s.speechDate)}</span>
                <span>·</span>
                <span>{s.speakerName}</span>
                <span className="ml-auto">
                  <ScoreBadge score={s.hawkDoveScore} />
                </span>
              </div>
              <h2 className="mt-2 font-medium">
                <Link href={`/konusma/${s.id}`} className="hover:text-accent">
                  {s.title}
                </Link>
              </h2>
              {s.summaryTr && (
                <p className="mt-1 line-clamp-3 text-sm text-muted">{s.summaryTr}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
