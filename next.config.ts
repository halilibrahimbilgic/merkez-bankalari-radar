import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Konuşma tam metinleri dinamik dosya adıyla okunuyor (data/speech-text/
  // <id>.txt); izleyicinin kaçırmaması için ISR yeniden üretiminde gereken
  // dosyalar sunucu paketine açıkça eklenir.
  outputFileTracingIncludes: {
    "/konusma/*": ["./data/speech-text/**/*"],
  },
};

export default nextConfig;
