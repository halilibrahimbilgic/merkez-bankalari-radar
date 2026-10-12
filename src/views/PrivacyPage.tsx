import type { Metadata } from "next";
import Link from "next/link";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/site";

export function privacyMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Gizlilik", "Privacy"),
    description: t(
      "Hangi verinin işlendiği, neden işlendiği ve haklarınız — kısa ve açık bir KVKK aydınlatma metni.",
      "What data is processed, why, and your rights — a short, plain privacy notice.",
    ),
    alternates: languageAlternates(lang, "/gizlilik"),
  };
}

/**
 * Bu sayfa sitenin gerçekte yaptığını anlatır; yeni bir analiz aracı, form ya
 * da çerez eklenirse burası da (iki dilde) güncellenmeli. Vercel Web
 * Analytics iddiaları Vercel'in kendi belgesinden alındı
 * (vercel.com/docs/analytics/privacy-policy, 12 Ekim 2026): çerez yok,
 * istekten üretilen özet 24 saatte silinir, IP ile ilişkilendirilmez.
 * Bağlayıcı metin Türkçedir (KVKK); İngilizce çeviri bunu söyler.
 */
const UPDATED: Record<Lang, string> = { tr: "12 Ekim 2026", en: "12 October 2026" };

export function PrivacyPage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const mail = (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
      {CONTACT_EMAIL}
    </a>
  );
  const vercelLink = (label: string) => (
    <a
      href="https://vercel.com/legal/privacy-policy"
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
    >
      {label}
    </a>
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Gizlilik", "Privacy")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Kısaca: hesap, form, çerez ve reklam yok. Yalnızca hangi sayfaların ziyaret edildiğini kimliğinizi bilmeden sayıyoruz.",
            "In short: no accounts, forms, cookies or ads. We only count which pages are visited, without knowing who you are.",
          )}
        </p>
      </header>

      {lang === "en" ? (
        <>
          <Section title="Data controller">
            <p>
              This site is operated personally by {OPERATOR_NAME}, who is the data controller under
              Turkey&apos;s Personal Data Protection Law No. 6698 (KVKK). Contact: {mail}.
            </p>
            <p>
              This page is a translation; the Turkish version is the binding text.
            </p>
          </Section>

          <Section title="Data processed">
            <h3 className="font-medium text-foreground">1. Visit statistics</h3>
            <p>
              Vercel Web Analytics is used to see which pages are read and how much. The
              information recorded is: the address of the page visited, the referring site,
              country, browser, operating system and device type.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>No cookies are used.</li>
              <li>
                Visitors are distinguished by a hash derived from the request itself; this hash is
                not stored and expires after 24 hours.
              </li>
              <li>Your IP address is not linked to the statistics and is not stored.</li>
              <li>Results are only visible as aggregate numbers; who you are cannot be known.</li>
            </ul>
            <p>
              Legal basis: legitimate interest in operating and improving the site (KVKK Art.
              5/2-f).
            </p>

            <h3 className="mt-4 font-medium text-foreground">2. Server logs</h3>
            <p>
              The site is hosted on the infrastructure of Vercel Inc. (USA). As with any website,
              technical logs of page requests (IP address, time, requested address) are kept
              briefly by the hosting provider for security and operational purposes. These logs
              are covered by {vercelLink("Vercel's privacy policy")}; the site operator does not use
              them to identify visitors. The data is processed on servers abroad.
            </p>

            <h3 className="mt-4 font-medium text-foreground">3. Theme preference</h3>
            <p>
              Your light/dark theme choice is stored only in your own browser (localStorage) and is
              not sent to the server. You can remove it by clearing your browser data. The language
              you read the site in is determined by the address (/en) and is not stored.
            </p>

            <h3 className="mt-4 font-medium text-foreground">4. Email correspondence</h3>
            <p>
              If you email us, your address and message are used only to reply; they are not
              shared with third parties or added to any list.
            </p>
          </Section>

          <Section title="What is not processed">
            <p>
              There is no membership, newsletter, comments or contact form. No advertising or
              third-party advertising/tracking scripts are used. The calendar subscription and the
              RSS feed are public files; subscribing records no information about you.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              Under Article 11 of the KVKK you have the right to learn whether your personal data is
              processed, to request information, to request correction or deletion, and to object.
              You can send requests to {mail}. Because visit statistics are not linked to your
              identity, it is technically impossible to find a record belonging to you in them.
            </p>
          </Section>

          <Section title="External links">
            <p>
              Source links on the site (central banks, BIS, Atlanta Fed) lead to sites subject to
              their own privacy policies.
            </p>
          </Section>
        </>
      ) : (
        <>
          <Section title="Veri sorumlusu">
            <p>
              Bu site {OPERATOR_NAME} tarafından kişisel olarak işletilmektedir. 6698 sayılı
              Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu odur. İletişim:{" "}
              {mail}.
            </p>
          </Section>

          <Section title="İşlenen veriler">
            <h3 className="font-medium text-foreground">1. Ziyaret istatistikleri</h3>
            <p>
              Hangi sayfaların ne kadar okunduğunu görmek için Vercel Web Analytics kullanılır.
              Kaydedilen bilgiler: ziyaret edilen sayfa adresi, sizi yönlendiren site, ülke,
              tarayıcı, işletim sistemi ve cihaz türü.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Çerez kullanılmaz.</li>
              <li>
                Ziyaretçiler, isteğin kendisinden üretilen bir özetle (hash) ayırt edilir; bu özet
                saklanmaz ve 24 saat sonra geçersiz olur.
              </li>
              <li>IP adresiniz istatistiklerle ilişkilendirilmez ve saklanmaz.</li>
              <li>Sonuçlar yalnızca toplu sayılar olarak görülür; kim olduğunuz bilinemez.</li>
            </ul>
            <p>
              Hukuki sebep: sitenin işletilmesi ve iyileştirilmesine yönelik meşru menfaat (KVKK m.
              5/2-f).
            </p>

            <h3 className="mt-4 font-medium text-foreground">2. Sunucu kayıtları</h3>
            <p>
              Site Vercel Inc. (ABD) altyapısında barındırılır. Her web sitesinde olduğu gibi,
              sayfa isteklerinin teknik kayıtları (IP adresi, zaman, istenen adres) güvenlik ve
              işletim amacıyla barındırma sağlayıcısı tarafından kısa süreliğine tutulur. Bu
              kayıtlar {vercelLink("Vercel'in gizlilik politikası")} kapsamındadır; site işleteni
              bunları ziyaretçileri tanımak için kullanmaz. Veriler yurt dışındaki sunucularda
              işlenir.
            </p>

            <h3 className="mt-4 font-medium text-foreground">3. Tema tercihi</h3>
            <p>
              Açık/koyu tema seçiminiz yalnızca kendi tarayıcınızda (localStorage) saklanır,
              sunucuya gönderilmez. Tarayıcı verilerinizi silerek kaldırabilirsiniz. Siteyi hangi
              dilde okuduğunuz adresten (/en) anlaşılır ve bir yerde saklanmaz.
            </p>

            <h3 className="mt-4 font-medium text-foreground">4. E-posta yazışmaları</h3>
            <p>
              Bize e-posta gönderirseniz adresiniz ve mesajınız yalnızca yanıt vermek için
              kullanılır, üçüncü kişilerle paylaşılmaz ve listeye eklenmez.
            </p>
          </Section>

          <Section title="İşlenmeyenler">
            <p>
              Üyelik, bülten, yorum ya da iletişim formu yoktur. Reklam ve reklam/izleme amaçlı
              üçüncü taraf betikleri kullanılmaz. Takvim aboneliği ve RSS akışı herkese açık
              dosyalardır; abone olduğunuzda size ait bir bilgi kaydedilmez.
            </p>
          </Section>

          <Section title="Haklarınız">
            <p>
              KVKK m. 11 uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep
              etme, düzeltilmesini ya da silinmesini isteme ve itiraz etme haklarına sahipsiniz.
              Başvurularınızı {mail} adresine iletebilirsiniz. Ziyaret istatistikleri kimliğinizle
              ilişkilendirilmediği için bu verilerde size ait bir kaydı bulmak teknik olarak mümkün
              değildir.
            </p>
          </Section>

          <Section title="Dış bağlantılar">
            <p>
              Sitedeki kaynak bağlantıları (merkez bankaları, BIS, Atlanta Fed) kendi gizlilik
              politikalarına tabi sitelere götürür.
            </p>
          </Section>
        </>
      )}

      <p className="text-sm text-muted">
        {t("Son güncelleme", "Last updated")}: {UPDATED[lang]} ·{" "}
        <Link href={localePath(lang, "/iletisim")} className="text-accent hover:underline">
          {t("İletişim", "Contact")}
        </Link>
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="prose-width space-y-3 text-muted">{children}</div>
    </section>
  );
}
