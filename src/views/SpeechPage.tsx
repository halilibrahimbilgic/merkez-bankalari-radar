import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import { BANKS, bankCountry, bankFullName, bankName } from "@/lib/banks";
import { getSpeech, getSpeechParagraphs } from "@/lib/data/speeches";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { speakerSlug } from "@/lib/speakers";
import { speechContext, speechRationale, speechSummary, speechTitle } from "@/lib/speech-i18n";
import { LICENSE_NOTICE_EN, LICENSE_NOTICE_TR } from "@/lib/text-license";
import { formatDate } from "@/lib/time";

export async function speechMetadata(lang: Lang, id: string): Promise<Metadata> {
  const speech = await getSpeech(id);
  if (!speech) return {};
  const summary = speechSummary(speech, lang);
  const bank = BANKS[speech.bankCode];
  return {
    title: `${speech.speakerName} — ${speechTitle(speech, lang)}`,
    description:
      summary?.lang === lang
        ? firstSentences(summary.text, 200)
        : lang === "en"
          ? `Speech by ${speech.speakerName} (${bankName(bank, lang)}).`
          : `${bank.nameTr} konuşması.`,
    alternates: languageAlternates(lang, `/konusma/${speech.id}`),
  };
}

export async function SpeechPage({ lang, id }: { lang: Lang; id: string }) {
  const speech = await getSpeech(id);
  if (!speech) notFound();
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);

  const bank = BANKS[speech.bankCode];
  const paragraphs = await getSpeechParagraphs(speech);
  const context = speechContext(speech, lang);
  const summary = speechSummary(speech, lang);
  const rationale = speechRationale(speech, lang);
  // Karşılığı olmayan metin diğer dilde gösterilir; bu not onu belli eder.
  const otherLang = lang === "en" ? "(in Turkish)" : "(İngilizce)";

  return (
    <article className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <BankTag code={speech.bankCode} lang={lang} />
          <span className="tabular">{formatDate(speech.speechDate, lang)}</span>
          <span>·</span>
          <Link href={p(`/konusmaci/${speakerSlug(speech.speakerName)}`)} className="text-accent hover:underline">
            {speech.speakerName}
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{speechTitle(speech, lang)}</h1>
        {/* Türkçe başlık bir çeviridir; kaynaktaki özgün başlık da görünür. */}
        {lang === "tr" && speech.titleTr && (
          <p lang="en" className="mt-1 text-sm text-muted">
            Özgün başlık: {speech.title}
          </p>
        )}
        {context && (
          <p lang={context.lang} className="prose-width mt-2 text-sm text-muted">
            {context.text}
          </p>
        )}
      </header>

      {speech.hawkDoveScore !== undefined ? (
        <section className="card p-5">
          <div className="text-sm text-muted">{t("Şahin/güvercin skoru", "Hawk/dove score")}</div>
          <div className="mt-1 text-2xl">
            <ScoreBadge score={speech.hawkDoveScore} hasPolicySignal={speech.hasPolicySignal} lang={lang} />
          </div>
          {rationale && (
            <p lang={rationale.lang} className="prose-width mt-2 text-muted">
              {rationale.text}
              {rationale.lang !== lang && <span className="text-xs"> {otherLang}</span>}
            </p>
          )}
          {/* Kart içinde gömülü yüzey: aynı beyaz üstünde 1px kenarlık
              hiyerarşi vermiyordu (bkz. --surface-sunken). */}
          {speech.hasPolicySignal === false && (
            <p className="prose-width mt-3 rounded-lg bg-surface-sunken p-3 text-sm text-muted">
              {t(
                "Bu konuşma para politikası duruşuna dair sinyal taşımıyor. Sıfır puanı \"dengeli duruş\" değil \"sinyal yok\" anlamına gelir; bu yüzden bankanın ortalama skoruna katılmaz.",
                "This speech carries no signal about the monetary policy stance. Its score of zero means \"no signal\", not \"balanced stance\", so it is not included in the bank's average score.",
              )}
            </p>
          )}
        </section>
      ) : (
        <p className="card p-5 text-muted">{t("Bu konuşma henüz skorlanmadı.", "This speech has not been scored yet.")}</p>
      )}

      {summary && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">
            {t("Türkçe özet", "Summary")}
            {summary.lang !== lang && (
              <span className="text-sm font-normal text-muted"> {otherLang}</span>
            )}
          </h2>
          <p lang={summary.lang} className="prose-width leading-relaxed text-foreground">
            {summary.text}
          </p>
        </section>
      )}

      <section className="card p-5 text-sm text-muted">
        <p className="prose-width">
          {t(
            "Özet ve skor bir dil modeli tarafından üretilmiştir; orijinal metnin yerini tutmaz.",
            "The summary and score are produced by a language model and are no substitute for the original text.",
          )}{" "}
          <a
            href={speech.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-accent hover:underline"
          >
            {t("Kaynak", "Source")}: BIS Central Bankers&apos; Speeches →
          </a>
        </p>
        {speech.textIsExcerpt && (
          <p className="prose-width mt-2">
            {t(
              "BIS bu konuşmanın yalnızca giriş bölümünü yayımlıyor; özet ve skor kısıtlı metne dayanıyor. Tam metin için kaynak bağlantısındaki PDF'e bakın.",
              "BIS publishes only the introductory section of this speech; the summary and score are based on the limited text. See the PDF at the source link for the full text.",
            )}
          </p>
        )}
        {speech.model && (
          <p className="mt-2 tabular">
            {t("Model", "Model")}: {speech.model}
            {speech.promptVersion && t(` · prompt sürümü ${speech.promptVersion}`, ` · prompt version ${speech.promptVersion}`)}
          </p>
        )}
        {speech.scoredVia === "session" && (
          <p className="prose-width mt-2">
            {t(
              "Bu skor, API kredisi bulunmadığından toplu iş yerine bir Claude Code oturumunda aynı ölçek ve kurallarla üretildi.",
              "This score was produced in a Claude Code session rather than the batch job, with the same scale and rules, because no API credit was available.",
            )}
          </p>
        )}
        {speech.scoredVia === "claude-code" && (
          <p className="prose-width mt-2">
            {t(
              "Bu skor, günlük veri işinde Claude Code ile aynı prompt, ölçek ve kurallarla otomatik üretildi.",
              "This score was produced automatically in the daily data job with Claude Code, using the same prompt, scale and rules.",
            )}
          </p>
        )}
        <p className="mt-2">
          {bankName(bank, lang)} ({bankFullName(bank, lang)}) · {bankCountry(bank, lang)}
        </p>
      </section>

      {paragraphs ? (
        <section aria-labelledby="tam-metin">
          <h2 id="tam-metin" className="mb-1 text-lg font-semibold">
            {speech.textIsExcerpt
              ? t("Konuşmanın giriş bölümü", "Introductory section of the speech")
              : t("Konuşmanın tam metni", "Full text of the speech")}
            {lang === "tr" && <span className="text-sm font-normal text-muted"> (İngilizce)</span>}
          </h2>
          <p className="prose-width mb-4 text-sm text-muted">
            {lang === "en"
              ? `${LICENSE_NOTICE_EN[speech.textLicense!]} The text was extracted automatically from the publisher's PDF or web page; only line breaks were adjusted. Footnotes and tables may have turned into plain text — see the source for the official text.`
              : `${LICENSE_NOTICE_TR[speech.textLicense!]} Metin yayımcının PDF ya da sayfasından otomatik çıkarıldı; yalnızca satır kırılımları düzenlendi. Dipnotlar ve tablolar düz metne dönüşmüş olabilir — resmî metin için kaynağa bakın.`}
          </p>
          <div lang="en" className="prose-width space-y-4 leading-relaxed text-foreground">
            {paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      ) : (
        <p className="card p-5 text-sm text-muted">
          {t(
            "Bu konuşmanın tam metni, yayımcısının kullanım şartları sitede yeniden yayımlanmasına izin vermediği için burada gösterilmiyor.",
            "The full text of this speech is not shown here because the publisher's terms of use do not allow it to be republished on this site.",
          )}{" "}
          <a
            href={speech.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-accent hover:underline"
          >
            {t("Kaynakta okuyun →", "Read it at the source →")}
          </a>
        </p>
      )}

      <Link href={p("/konusmalar")} className="inline-block text-sm text-accent hover:underline">
        {t("← Tüm konuşmalar", "← All speeches")}
      </Link>
    </article>
  );
}

/**
 * Arama sonucu açıklaması: Google ~160 karakterden sonrasını keser; özetin
 * tamamı (~900 karakter) yarım cümleyle biterdi. Cümle sınırında kısaltılır.
 */
function firstSentences(text: string, max: number): string {
  let out = "";
  for (const s of text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text]) {
    if (out && (out + s).length > max) break;
    out += s;
  }
  if (out.length <= max) return out.trim();
  // Tek cümle bile uzunsa kelime sınırında kes, kelimeyi bölme.
  const cut = out.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "")}…`;
}
