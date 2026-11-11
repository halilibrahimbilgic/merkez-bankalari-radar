import type { Metadata } from "next";
import Link from "next/link";
import { Card, TableFrame, Th } from "@/components/ui";
import { apiDecisions, apiMeetings, API_VERSION, BANK_CODES } from "@/lib/api-v1";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

/**
 * Açık API'nin belgesi (/gelistiriciler). Örnek yanıtlar gerçek veriden:
 * belge kodla aynı anda değişir, elle yazılmış örnek eskimez.
 */

export function developersMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Geliştiriciler için açık API", "Open API for developers"),
    description: t(
      "Fed, ECB, TCMB, BoE, BoJ ve RBA toplantı takvimi, kararlar, karar metni puanları ve Türkiye enflasyonu — anahtarsız, ücretsiz JSON API.",
      "Fed, ECB, CBRT, BoE, BoJ and RBA meeting calendar, decisions, statement scores and Turkey inflation — a free JSON API, no key required.",
    ),
    alternates: languageAlternates(lang, "/gelistiriciler"),
  };
}

export async function DevelopersPage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const base = `${SITE_URL}/api/${API_VERSION}`;
  const now = new Date().toISOString();
  const [meetings, decisions] = await Promise.all([apiMeetings("tcmb"), apiDecisions("tcmb")]);
  const nextMeeting = meetings.data.find((m) => m.at > now) ?? meetings.data.at(-1);
  const lastDecision = decisions.data[0];

  const endpoints: [string, string, string][] = [
    [`/api/${API_VERSION}/meetings`, t("Altı bankanın faiz toplantıları (geçmiş ve gelecek), karar sonucuyla", "Rate meetings of all six banks (past and upcoming) with outcomes"), "meetings"],
    [`/api/${API_VERSION}/meetings/{bank}`, t("Tek bankanın toplantıları", "One bank's meetings"), "meetings/tcmb"],
    [`/api/${API_VERSION}/decisions`, t("Sonuçlanmış kararlar: beklenti ve sürpriz, karar metni ve tutanak özeti ve puanı", "Decided meetings: expectation and surprise, statement and minutes summary and score"), "decisions"],
    [`/api/${API_VERSION}/decisions/{bank}`, t("Tek bankanın kararları", "One bank's decisions"), "decisions/fed"],
    [`/api/${API_VERSION}/inflation/tr`, t("Türkiye TÜFE (aylık, yıllık, anket beklentisi), TÜİK takvimi, anket turları", "Turkey CPI (monthly, annual, survey expectation), TurkStat calendar, survey rounds"), "inflation/tr"],
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Geliştiriciler için açık API", "Open API for developers")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Sitedeki takvim, kararlar, karar metni ve tutanak puanları ve Türkiye enflasyonu JSON olarak. Anahtar ve kayıt gerekmez, ücretsizdir; kaynak olarak Faiz Radar'ı belirtmeniz yeterli.",
            "The site's calendar, decisions, statement and minutes scores and Turkey inflation as JSON. No key or sign-up, free of charge; just credit Faiz Radar as the source.",
          )}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("Uçlar", "Endpoints")}</h2>
        <TableFrame minWidth="36rem">
          <thead>
            <tr className="border-b border-border-strong text-left text-muted">
              <Th>{t("Adres (GET)", "Path (GET)")}</Th>
              <Th>{t("İçerik", "Contents")}</Th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map(([path, desc, example]) => (
              <tr key={path} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5 align-top">
                  <a href={`/api/${API_VERSION}/${example}`} className="font-mono text-xs text-accent hover:underline">
                    {path}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-muted">{desc}</td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
        <p className="text-sm text-muted">
          {t("Banka kodları: ", "Bank codes: ")}
          <code>{BANK_CODES.join(", ")}</code>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("Örnek", "Example")}</h2>
        <pre className="card overflow-x-auto p-4 text-xs">
          <code>{`curl ${base}/meetings/tcmb`}</code>
        </pre>
        <p className="text-sm text-muted">
          {t("Yanıttaki bir toplantı (gerçek veri):", "One meeting from the response (live data):")}
        </p>
        <pre className="card overflow-x-auto p-4 text-xs">
          <code>{JSON.stringify(nextMeeting, null, 2)}</code>
        </pre>
        {lastDecision && (
          <>
            <p className="text-sm text-muted">
              {t("Kararlar ucundan bir kayıt:", "A record from the decisions endpoint:")}
            </p>
            <pre className="card overflow-x-auto p-4 text-xs">
              <code>{JSON.stringify(lastDecision, null, 2)}</code>
            </pre>
          </>
        )}
      </section>

      <Card>
        <h2 className="text-lg font-semibold">{t("Bilmeniz gerekenler", "Good to know")}</h2>
        <ul className="prose-width mt-2 list-inside list-disc space-y-1.5 text-sm text-muted">
          <li>
            {t(
              "Zamanlar UTC (ISO-8601); trt alanı aynı anı Türkiye saatiyle verir. Saati önceden duyurulmayan kararlarda (BoJ) timeTbd true, saat null.",
              "Times are UTC (ISO-8601); the trt field gives the same moment in Turkey time. For decisions whose time is not announced in advance (BoJ), timeTbd is true and time is null.",
            )}
          </li>
          <li>
            {t(
              "Fed tek oran değil aralık ilan eder: rate üst sınır, rateLower alt sınır. Diğer bankalarda rateLower null.",
              "The Fed sets a range: rate is the upper bound, rateLower the lower bound. For other banks rateLower is null.",
            )}
          </li>
          <li>
            {t(
              "Puanlar -10 (çok güvercin) ile +10 (çok şahin) arasında ve bir dil modelinin değerlendirmesidir; özetler de model çıktısıdır.",
              "Scores run from -10 (very dovish) to +10 (very hawkish) and are a language model's assessment; summaries are model output too.",
            )}
          </li>
          <li>
            {t(
              "Yanıtlar önbellekten verilir ve en geç bir saatte tazelenir; karar anını saniyesinde izlemek için uygun değildir. meta.generatedAt yanıtın üretildiği (önbelleğe alındığı) andır, isteğin yapıldığı an değil; verinin tazeliği için sourceUpdatedAt'a bakın. Anahtar ya da istek sınırı yok, makul kullanın.",
              "Responses are served from cache and refreshed within an hour; not suitable for second-by-second tracking of a decision. meta.generatedAt is when the response was produced (cached), not when you made the request; for data freshness use sourceUpdatedAt. There is no key or rate limit — please be reasonable.",
            )}
          </li>
          <li>
            {t(
              "Biçim /v1 içinde değişmez; değişmesi gerekirse /v2 açılır.",
              "The format will not change within /v1; if it has to, /v2 will be added.",
            )}
          </li>
          <li>
            {t(
              "Sitedeki bazı veriler API'de yok, çünkü yeniden dağıtım izni yok: Fed faiz olasılıkları (Atlanta Fed, yalnızca kişisel ve eğitim amaçlı), BoE piyasa beklentisi (ticari olmayan kullanım) ve karar metinlerinin tam metni.",
              "Some data on the site is not in the API because redistribution is not permitted: Fed rate probabilities (Atlanta Fed, personal and educational use only), the BoE market-implied path (non-commercial use) and the full text of statements.",
            )}
          </li>
          <li>{t("Yatırım tavsiyesi değildir.", "Not investment advice.")}</li>
        </ul>
      </Card>

      <p className="prose-width text-sm text-muted">
        {t("API'yi bir projede mi kullanıyorsunuz? Duymak isteriz: ", "Using the API in a project? We'd love to hear about it: ")}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
          {CONTACT_EMAIL}
        </a>
        {" · "}
        <Link href={localePath(lang, "/hakkinda")} className="text-accent hover:underline">
          {t("Kaynaklar ve yöntem", "Sources and methodology")}
        </Link>
      </p>
    </div>
  );
}
