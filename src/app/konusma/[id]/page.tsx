import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import { BANKS } from "@/lib/banks";
import { getSpeech, getSpeechIds } from "@/lib/data/speeches";
import { formatDateTr } from "@/lib/time";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getSpeechIds()).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/konusma/[id]">): Promise<Metadata> {
  const { id } = await params;
  const speech = await getSpeech(id);
  if (!speech) return {};
  return {
    title: `${speech.speakerName} — ${speech.title}`,
    description: speech.summaryTr ?? `${BANKS[speech.bankCode].nameTr} konuşması.`,
  };
}

export default async function SpeechPage({ params }: PageProps<"/konusma/[id]">) {
  const { id } = await params;
  const speech = await getSpeech(id);
  if (!speech) notFound();

  const bank = BANKS[speech.bankCode];

  return (
    <article className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <BankTag code={speech.bankCode} />
          <span className="tabular">{formatDateTr(speech.speechDate)}</span>
          <span>·</span>
          <span>{speech.speakerName}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{speech.title}</h1>
      </header>

      {speech.hawkDoveScore !== undefined ? (
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="text-sm text-muted">Şahin/güvercin skoru</div>
          <div className="mt-1 text-2xl">
            <ScoreBadge score={speech.hawkDoveScore} />
          </div>
          {speech.scoreRationaleTr && (
            <p className="prose-width mt-2 text-muted">{speech.scoreRationaleTr}</p>
          )}
          {speech.hasPolicySignal === false && (
            <p className="prose-width mt-3 rounded border border-border p-3 text-sm text-muted">
              Bu konuşma para politikası duruşuna dair sinyal taşımıyor. Sıfır
              puanı &quot;dengeli duruş&quot; değil &quot;sinyal yok&quot;
              anlamına gelir; bu yüzden bankanın ortalama skoruna katılmaz.
            </p>
          )}
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-surface p-5 text-muted">
          Bu konuşma henüz skorlanmadı.
        </p>
      )}

      {speech.summaryTr && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Türkçe özet</h2>
          <p className="prose-width leading-relaxed text-foreground">
            {speech.summaryTr}
          </p>
        </section>
      )}

      <section className="rounded-lg border border-border bg-surface p-5 text-sm text-muted">
        <p className="prose-width">
          Özet ve skor bir dil modeli tarafından üretilmiştir; orijinal metnin
          yerini tutmaz.{" "}
          <a
            href={speech.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-accent hover:underline"
          >
            Konuşmanın tam metni (BIS, İngilizce) →
          </a>
        </p>
        {speech.textIsExcerpt && (
          <p className="prose-width mt-2">
            BIS bu konuşmanın yalnızca giriş bölümünü yayımlıyor; özet ve skor
            kısıtlı metne dayanıyor. Tam metin için kaynak bağlantısındaki
            PDF&apos;e bakın.
          </p>
        )}
        {speech.model && (
          <p className="mt-2 tabular">
            Model: {speech.model}
            {speech.promptVersion && ` · prompt sürümü ${speech.promptVersion}`}
          </p>
        )}
        {speech.scoredVia === "session" && (
          <p className="prose-width mt-2">
            Bu skor, API kredisi bulunmadığından toplu iş yerine bir Claude Code
            oturumunda aynı ölçek ve kurallarla üretildi.
          </p>
        )}
        <p className="mt-2">
          {bank.nameTr} ({bank.nameEn}) · {bank.countryTr}
        </p>
      </section>

      <Link href="/konusmalar" className="inline-block text-sm text-accent hover:underline">
        ← Tüm konuşmalar
      </Link>
    </article>
  );
}
