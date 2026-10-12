import type { Metadata } from "next";
import Link from "next/link";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { CONTACT_EMAIL, REPO_URL } from "@/lib/site";

export function contactMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("İletişim", "Contact"),
    description: t(
      "Veri hatası bildirimi, öneri ve sorular için iletişim.",
      "Contact for reporting data errors, suggestions and questions.",
    ),
    alternates: languageAlternates(lang, "/iletisim"),
  };
}

/**
 * Form yok, bilinçli olarak: form kişisel veri toplamak, saklamak ve spam
 * korumasıyla uğraşmak demek (bkz. /gizlilik). Doğrudan e-posta aynı işi
 * görür ve ziyaretçinin verisi bizim sistemimize hiç girmez.
 */
export function ContactPage({ lang }: { lang: Lang }) {
  const t = L(lang);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("İletişim", "Contact")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Hatalı bir veri, eksik bir toplantı ya da bir öneri mi fark ettiniz? Haber vermeniz siteyi doğrudan iyileştirir.",
            "Spotted a wrong figure, a missing meeting or have a suggestion? Letting us know improves the site directly.",
          )}
        </p>
      </header>

      <section className="card p-5">
        <div className="text-sm text-muted">{t("E-posta", "Email")}</div>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-1 inline-block text-lg font-semibold text-accent hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
        <p className="prose-width mt-2 text-sm text-muted">
          {t(
            "Kişisel bir proje olduğu için yanıt süresi değişebilir.",
            "This is a personal project, so response times may vary. You can write in English or Turkish.",
          )}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Veri hatası bildirirken", "When reporting a data error")}</h2>
        <ul className="prose-width list-inside list-disc space-y-1 text-muted">
          <li>{t("Hatanın göründüğü sayfanın adresi", "The address of the page where the error appears")}</li>
          <li>{t("Sitede yazan değer ve doğrusu", "The value shown on the site and the correct one")}</li>
          <li>
            {t(
              "Mümkünse doğru değerin resmî kaynağı (merkez bankasının duyurusu)",
              "If possible, the official source of the correct value (the central bank's announcement)",
            )}
          </li>
        </ul>
        <p className="prose-width mt-3 text-muted">
          {t(
            "Veriler her gün resmî kaynaklardan otomatik çekilir; bir hata çoğunlukla kaynağın biçim değiştirmesinden kaynaklanır ve hızlıca düzeltilebilir.",
            "Data is fetched automatically from official sources every day; an error usually comes from a source changing its format and can be fixed quickly.",
          )}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Teknik konular", "Technical matters")}</h2>
        <p className="prose-width text-muted">
          {t("Sitenin kaynak kodu açıktır. Hata kayıtları ve öneriler için", "The site's source code is open. For bug reports and suggestions,")}{" "}
          <a
            href={`${REPO_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {t("GitHub üzerinden kayıt açabilirsiniz", "you can open an issue on GitHub")}
          </a>
          .
        </p>
      </section>

      <p className="prose-width text-sm text-muted">
        {t(
          "Bireysel yatırım sorularına yanıt verilmez; bu site yatırım tavsiyesi vermez. Kişisel verilerle ilgili başvurular için",
          "Individual investment questions are not answered; this site does not give investment advice. For requests concerning personal data, see the",
        )}{" "}
        <Link href={localePath(lang, "/gizlilik")} className="text-accent hover:underline">
          {t("gizlilik sayfasına", "privacy page")}
        </Link>
        {t(" bakın.", ".")}
      </p>
    </div>
  );
}
