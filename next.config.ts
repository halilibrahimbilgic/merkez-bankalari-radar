import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sürüm bilgisi sızdırmasın.
  poweredByHeader: false,
  // Asgari güvenlik başlıkları. CSP bilinçli olarak yok: tema için satır içi
  // betik (layout.tsx) ve grafik kütüphanesi var; test edilmeden açılan bir
  // CSP sayfayı sessizce kırar.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  // Konuşma tam metinleri dinamik dosya adıyla okunuyor (data/speech-text/
  // <id>.txt); izleyicinin kaçırmaması için ISR yeniden üretiminde gereken
  // dosyalar sunucu paketine açıkça eklenir.
  // İki dilin konuşma rotası da (Türkçe kök, /en) aynı dosyaları okur.
  outputFileTracingIncludes: {
    "/konusma/*": ["./data/speech-text/**/*"],
    "/en/konusma/*": ["./data/speech-text/**/*"],
    // Haber, beklenti, geçmiş, enflasyon ve karar metni dosyaları sabit adla
    // okunur ama ISR yeniden üretiminde de bulunduklarından emin olmak için
    // açıkça eklenir. Karar metinleri dinamik adla (data/statements/<id>.<dil>.txt).
    "/*": [
      "./data/news/news.json",
      "./data/seed/expectations.json",
      "./data/seed/inflation.json",
      "./data/seed/statements.json",
      "./data/seed/events.json",
      "./data/seed/tcmb-funding.json",
      "./data/seed/minutes.json",
      "./data/history/expectations.json",
    ],
    "/en/*": [
      "./data/news/news.json",
      "./data/seed/expectations.json",
      "./data/seed/inflation.json",
      "./data/seed/statements.json",
      "./data/seed/events.json",
      "./data/seed/tcmb-funding.json",
      "./data/seed/minutes.json",
      "./data/history/expectations.json",
    ],
    "/karar/*": ["./data/statements/**/*"],
    "/en/karar/*": ["./data/statements/**/*"],
  },
};

export default nextConfig;
