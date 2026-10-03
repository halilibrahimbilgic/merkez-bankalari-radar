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
  outputFileTracingIncludes: {
    "/konusma/*": ["./data/speech-text/**/*"],
  },
};

export default nextConfig;
