import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { DataFreshness } from "@/components/DataFreshness";
import { LangSwitch } from "@/components/LangSwitch";
import { MobileMenu } from "@/components/MobileMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { SITE_URL, TELEGRAM_URL } from "@/lib/site";
import { THEME_KEY } from "@/lib/theme";
import "../app/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * İki dilin kök düzeni (app/(tr)/layout.tsx ve app/en/layout.tsx) bu
 * bileşeni kullanır. Ayrı kök düzenler <html lang>'ı doğru vermenin tek
 * yolu: tek kökte lang sabit "tr" kalır ve ekran okuyucu İngilizce sayfayı
 * Türkçe telaffuzla okurdu.
 */
export function rootMetadata(lang: Lang): Metadata {
  const en = lang === "en";
  return {
    title: {
      default: en
        ? "Faiz Radar — Central bank rate decisions in Turkey time"
        : "Faiz Radar — Merkez bankası faiz kararları, Türkiye saatiyle",
      template: "%s · Faiz Radar",
    },
    description: en
      ? "Fed, ECB, CBRT, BoE, BoJ and RBA meeting calendar in Turkey time; market-implied rate probabilities and a hawk/dove score of central bankers' speeches — for education only."
      : "Fed, ECB, TCMB, BoE, BoJ ve RBA faiz toplantı takvimi Türkiye saatiyle; piyasanın fiyatladığı faiz olasılıkları ve merkez bankası konuşmalarının şahin/güvercin skoru — Türkçe, eğitim amaçlı.",
    keywords: en
      ? [
          "Fed meeting", "FOMC calendar", "ECB rate decision", "CBRT rate decision",
          "rate probabilities", "hawkish dovish", "central bank calendar",
        ]
      : [
          "Fed toplantısı", "FOMC takvimi", "ECB faiz kararı", "TCMB PPK",
          "faiz olasılığı", "şahin güvercin", "merkez bankası takvimi",
          "Fed faiz kararı ne zaman", "PPK toplantısı tarihi",
        ],
    metadataBase: new URL(SITE_URL),
    alternates: {
      ...languageAlternates(lang, "/"),
      // RSS yalnızca Türkçe; İngilizce sayfada da aynı akış önerilir.
      types: { "application/rss+xml": [{ url: "/rss.xml", title: en ? "Rate decisions (Turkish)" : "Faiz kararları" }] },
    },
    openGraph: {
      type: "website",
      locale: en ? "en_GB" : "tr_TR",
      alternateLocale: en ? "tr_TR" : "en_GB",
      siteName: "Faiz Radar",
      url: `${SITE_URL}${localePath(lang, "/")}`,
    },
    // Büyük görselli kart: önizleme görselleri opengraph-image.tsx'lerden gelir.
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export function SiteShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  // Metodoloji altbilgide: üst menü sekiz bağlantıyla geniş ekranda tek
  // satıra ancak sığıyor.
  const nav = [
    { href: p("/takvim"), label: t("Takvim", "Calendar") },
    { href: p("/kararlar"), label: t("Kararlar", "Decisions") },
    { href: p("/faiz-olasiligi"), label: t("Faiz olasılığı", "Rate odds") },
    { href: p("/reel-faiz"), label: t("Reel faiz", "Real rates") },
    { href: p("/haberler"), label: t("Haberler", "News") },
    { href: p("/konusmalar"), label: t("Konuşmalar", "Speeches") },
    { href: p("/skor"), label: t("Şahin/Güvercin", "Hawk/Dove") },
    { href: p("/rehber"), label: t("Rehber", "Guide") },
  ];

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Kural Pages Router içindir; bu bileşen App Router kök düzenidir
          (yalnızca app/ dışında durduğu için kural onu tanımıyor). */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        {/*
          Tema, React hidrasyonundan ÖNCE uygulanmalı. Aksi halde koyu tema
          seçmiş kullanıcı ilk karede açık temayı görür (flash of wrong
          theme). Bu yüzden senkron, bloke eden küçük bir script:
          localStorage'ı okur ve <html> üzerine data-theme yazar.
          Seçim yoksa hiçbir şey yazmaz — CSS o durumda sisteme uyar.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans min-h-full flex flex-col">
        <a href="#icerik" className="skip-link rounded bg-accent px-3 py-2 text-sm text-background">
          {t("İçeriğe atla", "Skip to content")}
        </a>

        <header className="relative border-b border-border bg-surface">
          {/*
            Telefonda tek satır: marka, dil/tema ve "Menü"; menü açılınca
            sekiz bağlantı iki sütunda (MobileMenu). Önceden gezinme yatay
            kayıyordu ve sekiz bağlantının dördü ilk ekranda görünmüyordu
            (14 Ekim 2026, 390 px); sarmalı düzen ise başlığı üç satıra
            çıkarıyordu. sm ve üzerinde gezinme başlıkta tek satır.

            Düğmeler tek bir DOM kopyasıdır; satırlar arası yeri `order` ile
            değişir. İki kopya render etmek aynı denetimi ekran okuyucuya
            iki kez duyururdu.
          */}
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 px-4 py-2 sm:flex-nowrap sm:py-3">
            <Link
              href={p("/")}
              className="order-1 flex min-h-11 flex-col justify-center whitespace-nowrap leading-tight sm:min-h-0"
            >
              <span className="font-semibold tracking-tight">
                Faiz <span className="text-accent">Radar</span>
              </span>
              <span className="text-xs text-muted">
                {t("merkez bankaları takibi", "central bank tracker")}
              </span>
            </Link>

            <div className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:ml-2">
              <LangSwitch lang={lang} />
              <ThemeToggle lang={lang} />
              <MobileMenu items={nav} label={t("Menü", "Menu")} navLabel={t("Ana gezinme", "Main navigation")} />
            </div>

            <nav
              aria-label={t("Ana gezinme", "Main navigation")}
              className="hidden gap-x-4 gap-y-1 text-sm text-muted sm:order-2 sm:ml-auto sm:flex sm:flex-wrap"
            >
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex shrink-0 items-center hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main id="icerik" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted">
            <div className="mb-4 border-b border-border pb-4">
              <DataFreshness lang={lang} />
            </div>
            <p className="prose-width">
              {t(
                "Tüm saatler Türkiye saatidir (TRT, UTC+3). Veriler merkez bankalarının resmî takvimlerinden derlenir.",
                "All times are Turkey time (TRT, UTC+3). Data is compiled from the central banks' official calendars.",
              )}
            </p>
            <p className="prose-width mt-2">
              {t(
                "Bu site kişisel kullanım ve eğitim amaçlıdır. Burada yer alan hiçbir içerik yatırım tavsiyesi değildir.",
                "This site is for personal and educational use. Nothing here is investment advice.",
              )}{" "}
              <Link href={p("/hakkinda")} className="text-accent hover:underline">
                {t("Kaynaklar ve yöntem", "Sources and methodology")}
              </Link>
            </p>
            <nav aria-label={t("Site bilgileri", "Site information")} className="mt-3 flex flex-wrap gap-x-4">
              <Link href={p("/hakkinda")} className="inline-flex min-h-8 items-center text-accent hover:underline">
                {t("Metodoloji", "Methodology")}
              </Link>
              <Link href={p("/gizlilik")} className="inline-flex min-h-8 items-center text-accent hover:underline">
                {t("Gizlilik", "Privacy")}
              </Link>
              <Link href={p("/iletisim")} className="inline-flex min-h-8 items-center text-accent hover:underline">
                {t("İletişim", "Contact")}
              </Link>
              <a href="/rss.xml" className="inline-flex min-h-8 items-center text-accent hover:underline">
                {t("RSS", "RSS (Turkish)")}
              </a>
              <a href={TELEGRAM_URL} className="inline-flex min-h-8 items-center text-accent hover:underline" rel="me">
                {t("Telegram", "Telegram (Turkish)")}
              </a>
            </nav>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
