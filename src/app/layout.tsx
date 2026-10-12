import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { DataFreshness } from "@/components/DataFreshness";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE_URL, TELEGRAM_URL } from "@/lib/site";
import { THEME_KEY } from "@/lib/theme";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Faiz Radar — Merkez bankası faiz kararları, Türkiye saatiyle",
    template: "%s · Faiz Radar",
  },
  description:
    "Fed, ECB, TCMB, BoE, BoJ ve RBA faiz toplantı takvimi Türkiye saatiyle; piyasanın fiyatladığı faiz olasılıkları ve merkez bankası konuşmalarının şahin/güvercin skoru — Türkçe, eğitim amaçlı.",
  keywords: [
    "Fed toplantısı", "FOMC takvimi", "ECB faiz kararı", "TCMB PPK",
    "faiz olasılığı", "şahin güvercin", "merkez bankası takvimi",
    "Fed faiz kararı ne zaman", "PPK toplantısı tarihi",
  ],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/rss.xml", title: "Faiz kararları" }] },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Faiz Radar",
    url: SITE_URL,
  },
  // Büyük görselli kart: önizleme görselleri opengraph-image.tsx'lerden gelir.
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

const NAV = [
  { href: "/takvim", label: "Takvim" },
  { href: "/faiz-olasiligi", label: "Faiz olasılığı" },
  { href: "/konusmalar", label: "Konuşmalar" },
  { href: "/skor", label: "Şahin/Güvercin" },
  { href: "/hakkinda", label: "Metodoloji" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
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
          İçeriğe atla
        </a>

        <header className="border-b border-border bg-surface">
          {/*
            Mobilde iki satır: logo + tema düğmesi üstte, gezinme altta.
            Gezinme sarmak yerine yatay kayar — sarmalı düzen 375px'te
            başlığı üç satıra çıkarıyordu. sm ve üzerinde tek satır.

            Düğme tek bir DOM kopyasıdır; satırlar arası yeri `order` ile
            değişir. İki kopya render etmek aynı denetimi ekran okuyucuya
            iki kez duyururdu.
          */}
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 px-4 py-2 sm:flex-nowrap sm:py-3">
            <Link
              href="/"
              className="order-1 inline-flex min-h-11 items-center whitespace-nowrap font-semibold tracking-tight sm:min-h-0"
            >
              Faiz <span className="ml-1 text-accent">Radar</span>
            </Link>

            <div className="order-2 ml-auto sm:order-3 sm:ml-2">
              <ThemeToggle />
            </div>

            <nav
              aria-label="Ana gezinme"
              className="order-3 -mx-4 flex w-full gap-x-4 overflow-x-auto px-4 text-sm text-muted sm:order-2 sm:mx-0 sm:ml-auto sm:w-auto sm:flex-wrap sm:gap-y-1 sm:overflow-visible sm:px-0"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 shrink-0 items-center hover:text-accent sm:min-h-0"
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
              <DataFreshness />
            </div>
            <p className="prose-width">
              Tüm saatler Türkiye saatidir (TRT, UTC+3). Veriler merkez bankalarının
              resmî takvimlerinden derlenir.
            </p>
            <p className="prose-width mt-2">
              Bu site kişisel kullanım ve eğitim amaçlıdır. Burada yer alan hiçbir
              içerik yatırım tavsiyesi değildir.{" "}
              <Link href="/hakkinda" className="text-accent hover:underline">
                Kaynaklar ve yöntem
              </Link>
            </p>
            <nav aria-label="Site bilgileri" className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/gizlilik" className="text-accent hover:underline">
                Gizlilik
              </Link>
              <Link href="/iletisim" className="text-accent hover:underline">
                İletişim
              </Link>
              <a href="/rss.xml" className="text-accent hover:underline">
                RSS
              </a>
              <a href={TELEGRAM_URL} className="text-accent hover:underline" rel="me">
                Telegram
              </a>
            </nav>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
