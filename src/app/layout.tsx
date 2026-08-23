import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Merkez Bankaları Radar — Faiz toplantıları ve şahin/güvercin takibi",
    template: "%s · Merkez Bankaları Radar",
  },
  description:
    "Fed, ECB ve TCMB faiz toplantı takvimi Türkiye saatiyle; piyasanın fiyatladığı faiz olasılıkları ve merkez bankası konuşmalarının şahin/güvercin skoru — Türkçe, eğitim amaçlı.",
  keywords: [
    "Fed toplantısı", "FOMC takvimi", "ECB faiz kararı", "TCMB PPK",
    "faiz olasılığı", "şahin güvercin", "merkez bankası takvimi",
    "Fed faiz kararı ne zaman", "PPK toplantısı tarihi",
  ],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Merkez Bankaları Radar",
    url: SITE_URL,
  },
  twitter: { card: "summary" },
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
    >
      <body className="font-sans min-h-full flex flex-col">
        <a href="#icerik" className="skip-link rounded bg-accent px-3 py-2 text-sm text-background">
          İçeriğe atla
        </a>

        <header className="border-b border-border bg-surface">
          {/*
            Mobilde logo ve gezinme alt alta durur; nav sarmak yerine yatay
            kayar — sarmalı düzen 375px'te başlığı üç satıra çıkarıyordu.
            sm ve üzerinde tek satırda yan yana.
          */}
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center whitespace-nowrap font-semibold tracking-tight sm:min-h-0"
            >
              Merkez Bankaları <span className="ml-1 text-accent">Radar</span>
            </Link>
            <nav
              aria-label="Ana gezinme"
              className="-mx-4 flex gap-x-4 overflow-x-auto px-4 text-sm text-muted sm:mx-0 sm:flex-wrap sm:gap-y-1 sm:overflow-visible sm:px-0"
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
          </div>
        </footer>
      </body>
    </html>
  );
}
