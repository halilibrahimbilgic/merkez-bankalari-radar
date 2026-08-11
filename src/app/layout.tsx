import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Merkez Bankaları Radar — Faiz toplantıları ve şahin/güvercin takibi",
    template: "%s · Merkez Bankaları Radar",
  },
  description:
    "Fed, ECB ve TCMB faiz toplantı takvimi Türkiye saatiyle; faiz olasılıkları ve merkez bankası konuşmalarının şahin/güvercin skoru — Türkçe.",
  keywords: [
    "Fed toplantısı", "FOMC takvimi", "ECB faiz kararı", "TCMB PPK",
    "faiz olasılığı", "şahin güvercin", "merkez bankası takvimi",
  ],
};

const NAV = [
  { href: "/takvim", label: "Takvim" },
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
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Merkez Bankaları <span className="text-accent">Radar</span>
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted">
            <p>
              Tüm saatler Türkiye saatidir (TRT, UTC+3). Veriler merkez bankalarının
              resmî takvimlerinden derlenir.
            </p>
            <p className="mt-2">
              Burada yer alan hiçbir içerik yatırım tavsiyesi değildir.{" "}
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
