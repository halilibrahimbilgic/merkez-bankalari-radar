import type { NextConfig } from "next";

// İki dilin rotası aynı dosyaları okur; tek listede durur ki biri unutulmasın.
const DATA_FILES = [
  "./data/news/news.json",
  "./data/seed/expectations.json",
  "./data/seed/inflation.json",
  "./data/seed/statements.json",
  "./data/seed/events.json",
  "./data/seed/tcmb-funding.json",
  "./data/seed/tr-inflation.json",
  "./data/seed/minutes.json",
  "./data/seed/projections.json",
  "./data/history/expectations.json",
];

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Sürüm bilgisi sızdırmasın.
  poweredByHeader: false,
  // Asgari güvenlik başlıkları. CSP şimdilik yalnızca RAPOR modunda (CSP_REPORT_ONLY):
  // sayfayı kırmaz, ihlali tarayıcı konsoluna yazar. Zorlamaya geçmeden önce
  // gerçek tarayıcılarda (Vercel Analytics dahil) ihlal çıkmadığı görülmeli.
  // Nonce'lu katı politika kullanılmadı: nonce her sayfayı dinamik render'a
  // düşürür, ISR'ı bozar. 'unsafe-inline' tema betiği (SiteShell) ve Next'in
  // kendi satır içi betikleri içindir; yine de uzak betik, <base>, <object> ve
  // iframe'lenme engellenir.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
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
    "/*": DATA_FILES,
    "/en/*": DATA_FILES,
    "/karar/*": ["./data/statements/**/*"],
    "/en/karar/*": ["./data/statements/**/*"],
  },
};

export default nextConfig;
