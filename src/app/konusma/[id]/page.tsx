import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import { BANKS } from "@/lib/banks";
import { getSpeech, getSpeechIds, getSpeechParagraphs } from "@/lib/data/speeches";
import { LICENSE_NOTICE_TR } from "@/lib/text-license";
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
  const paragraphs = await getSpeechParagraphs(speech);

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
        {speech.contextEn && (
          <p lang="en" className="prose-width mt-2 text-sm text-muted">
            {speech.contextEn}
          </p>
        )}
      </header>

      {speech.hawkDoveScore !== undefined ? (
        <section className="card p-5">
          <div className="text-sm text-muted">Şahin/güvercin skoru</div>
          <div className="mt-1 text-2xl">
            <ScoreBadge score={speech.hawkDoveScore} />
          </div>
          {speech.scoreRationaleTr && (
            <p className="prose-width mt-2 text-muted">{speech.scoreRationaleTr}</p>
          )}
          {/* Kart içinde gömülü yüzey: aynı beyaz üstünde 1px kenarlık
              hiyerarşi vermiyordu (bkz. --surface-sunken). */}
          {speech.hasPolicySignal === false && (
            <p className="prose-width mt-3 rounded-lg bg-surface-sunken p-3 text-sm text-muted">
              Bu konuşma para politikası duruşuna dair sinyal taşımıyor. Sıfır
              puanı &quot;dengeli duruş&quot; değil &quot;sinyal yok&quot;
              anlamına gelir; bu yüzden bankanın ortalama skoruna katılmaz.
            </p>
          )}
        </section>
      ) : (
        <p className="card p-5 text-muted">
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

      <section className="card p-5 text-sm text-muted">
        <p className="prose-width">
          Özet ve skor bir dil modeli tarafından üretilmiştir; orijinal metnin
          yerini tutmaz.{" "}
          <a
            href={speech.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-accent hover:underline"
          >
            Kaynak: BIS Central Bankers&apos; Speeches →
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
        {speech.scoredVia === "claude-code" && (
          <p className="prose-width mt-2">
            Bu skor, günlük veri işinde Claude Code ile aynı prompt, ölçek ve
            kurallarla otomatik üretildi.
          </p>
        )}
        <p className="mt-2">
          {bank.nameTr} ({bank.nameEn}) · {bank.countryTr}
        </p>
      </section>

      {paragraphs ? (
        <section aria-labelledby="tam-metin">
          <h2 id="tam-metin" className="mb-1 text-lg font-semibold">
            {speech.textIsExcerpt ? "Konuşmanın giriş bölümü" : "Konuşmanın tam metni"}{" "}
            <span className="text-sm font-normal text-muted">(İngilizce)</span>
          </h2>
          <p className="prose-width mb-4 text-sm text-muted">
            {LICENSE_NOTICE_TR[speech.textLicense!]} Metin yayımcının PDF ya da
            sayfasından otomatik çıkarıldı; yalnızca satır kırılımları
            düzenlendi. Dipnotlar ve tablolar düz metne dönüşmüş olabilir —
            resmî metin için kaynağa bakın.
          </p>
          <div lang="en" className="prose-width space-y-4 leading-relaxed text-foreground">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      ) : (
        <p className="card p-5 text-sm text-muted">
          Bu konuşmanın tam metni, yayımcısının kullanım şartları sitede yeniden
          yayımlanmasına izin vermediği için burada gösterilmiyor.{" "}
          <a
            href={speech.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-accent hover:underline"
          >
            Kaynakta okuyun →
          </a>
        </p>
      )}

      <Link href="/konusmalar" className="inline-block text-sm text-accent hover:underline">
        ← Tüm konuşmalar
      </Link>
    </article>
  );
}
