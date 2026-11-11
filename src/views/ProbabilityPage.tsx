import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { getExpectations } from "@/lib/data/expectations";
import { getExpectationHistory } from "@/lib/data/history";
import { Term } from "@/components/Term";
import { getPastMeetings } from "@/lib/data/meetings";
import { getCurrentRate } from "@/lib/data/rates";
import { getProbabilitySnapshot } from "@/lib/data/probabilities";
import { L, languageAlternates, type Lang } from "@/lib/i18n";
import { BoeExpectations, EcbExpectations, OtherBanksNote, TcmbExpectations } from "./ExpectationSections";
import { FedProbabilities } from "./probability/FedProbabilities";

export function probabilityMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Faiz olasılıkları ve beklentileri", "Rate probabilities and expectations"),
    description: t(
      "Fed, ECB, BoE ve TCMB için faiz beklentileri: piyasanın fiyatladığı olasılıklar (Atlanta Fed, BoE OIS eğrisi), ECB analist anketi ve TCMB Piyasa Katılımcıları Anketi — Türkçe açıklamalı.",
      "Rate expectations for the Fed, ECB, BoE and CBRT: market-implied probabilities (Atlanta Fed, BoE OIS curve), the ECB Survey of Monetary Analysts and the CBRT Survey of Market Participants.",
    ),
    alternates: languageAlternates(lang, "/faiz-olasiligi"),
  };
}

export async function ProbabilityPage({
  lang,
  donem,
}: {
  lang: Lang;
  /** Seçili Fed penceresinin başlangıcı (/faiz-olasiligi/<YYYY-MM-DD>); yoksa ilk pencere. */
  donem?: string;
}) {
  const t = L(lang);
  const [snapshot, expectations, tcmbRate, tcmbMeetings, ecbRate, ecbMeetings, history] = await Promise.all([
    getProbabilitySnapshot(),
    getExpectations(),
    getCurrentRate("tcmb"),
    getPastMeetings({ bankCode: "tcmb", limit: 6 }),
    getCurrentRate("ecb"),
    getPastMeetings({ bankCode: "ecb", limit: 6 }),
    getExpectationHistory(),
  ]);
  const now = new Date();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("Faiz olasılıkları ve beklentileri", "Rate probabilities and expectations")}
        </h1>
        <p className="prose-width mt-2 text-muted">
          {lang === "en" ? (
            <>
              Market-implied expectations for the Fed and BoE; results of surveys of analysts and economists for the ECB
              and CBRT. They are different things:{" "}
              <Term id="piyasa-fiyatlamasi" lang={lang}>
                market pricing
              </Term>{" "}
              changes daily,{" "}
              <Term id="anket-beklentisi" lang={lang}>
                surveys
              </Term>{" "}
              are run once per meeting or month.
            </>
          ) : (
            <>
              Fed ve BoE için piyasanın fiyatladığı beklentiler; ECB ve TCMB için analist ve ekonomistlere sorulan
              anketlerin sonucu. İkisi farklı şeylerdir:{" "}
              <Term id="piyasa-fiyatlamasi" lang={lang}>
                piyasa fiyatlaması
              </Term>{" "}
              her gün değişir,{" "}
              <Term id="anket-beklentisi" lang={lang}>
                anketler
              </Term>{" "}
              toplantı ya da ay başına bir kez yapılır.
            </>
          )}
        </p>
        <nav aria-label={t("Bankalar", "Banks")} className="mt-3 flex flex-wrap gap-2 text-sm">
          {[
            { id: "fed", label: "Fed" },
            { id: "ecb", label: "ECB", show: !!expectations.ecb },
            { id: "boe", label: "BoE", show: !!expectations.boe },
            { id: "tcmb", label: t("TCMB", "CBRT"), show: !!expectations.tcmb },
          ]
            .filter((b) => b.show !== false)
            .map((b) => (
              <a
                key={b.id}
                href={`#${b.id}`}
                className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-muted hover:border-accent hover:text-accent"
              >
                {b.label}
              </a>
            ))}
        </nav>
      </header>

      <section id="fed" className="scroll-mt-4 space-y-8">
        {snapshot && snapshot.windows.length > 0 ? (
          <FedProbabilities lang={lang} snapshot={snapshot} donem={donem} windows={history.fedWindows} />
        ) : (
          <EmptyState>{t("Fed olasılık verisi henüz yüklenmedi.", "Fed probability data has not been loaded yet.")}</EmptyState>
        )}
      </section>

      {expectations.ecb && (
        <EcbExpectations
          data={expectations.ecb}
          currentRate={ecbRate?.rate}
          meetings={ecbMeetings}
          now={now}
          history={history.banks.ecb?.meetings}
          lang={lang}
        />
      )}
      {expectations.boe && <BoeExpectations data={expectations.boe} history={history.banks.boe?.meetings} lang={lang} />}
      {expectations.tcmb && (
        <TcmbExpectations
          data={expectations.tcmb}
          currentRate={tcmbRate?.rate}
          meetings={tcmbMeetings}
          now={now}
          history={history.banks.tcmb?.meetings}
          lang={lang}
        />
      )}
      <OtherBanksNote lang={lang} />
    </div>
  );
}
