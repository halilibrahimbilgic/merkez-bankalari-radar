import { CopyButton } from "@/components/CopyButton";
import { getWeekCard, WEEK_CARD_SIZE, weekCardDate, weekPostText } from "./week-card";

/**
 * Site sahibinin haftalık paylaşım aracı: görsel, indirme bağlantısı ve
 * LinkedIn'e yapıştırılacak metin. Menüde yok, arama motoruna kapalı.
 */
export async function WeekCardPage({ hafta }: { hafta?: string }) {
  const card = await getWeekCard(weekCardDate(hafta));
  const text = weekPostText(card);
  // Geçersiz değeri görsel de yok sayar (weekCardDate), aynı haftayı çizer.
  const src = hafta ? `/bu-hafta/gorsel.png?hafta=${encodeURIComponent(hafta)}` : "/bu-hafta/gorsel.png";
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Haftalık paylaşım kartı</h1>
        <p className="prose-width mt-2 text-muted">
          {card.range} haftası. Görsel ve metin saatlik yenilenir; karar açıklanınca satır beklentiden sonuca döner.
          Pazartesi sabahı paylaşmak için hazırlandı; cumartesiden itibaren sıradaki haftayı gösterir. Başka bir
          hafta için adrese <code>?hafta=2026-12-09</code> ekleyin.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- üretilen PNG, next/image optimizasyonu gereksiz */}
          <img
            src={src}
            alt={`Merkez bankaları, ${card.range}: bu haftanın faiz kararları ve önemli yayınlar`}
            width={WEEK_CARD_SIZE.width}
            height={WEEK_CARD_SIZE.height}
            className="h-auto w-full max-w-md rounded-lg border border-border"
          />
          <a
            href={src}
            download={`faiz-radar-bu-hafta.png`}
            className="inline-flex min-h-9 items-center text-sm text-accent hover:underline"
          >
            Görseli indir (1080×1350)
          </a>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">LinkedIn metni</h2>
            <CopyButton text={text} label="Metni kopyala" done="Kopyalandı" />
          </div>
          <textarea
            readOnly
            value={text}
            rows={18}
            aria-label="LinkedIn metni"
            className="w-full rounded-lg border border-border bg-surface-sunken p-3 font-mono text-xs leading-relaxed"
          />
          <p className="text-xs text-muted">
            Bağlantı <code>utm_source=linkedin</code> taşır; {"LinkedIn'den gelenler Vercel'de \"UTM Parameters\" sekmesinde görünür."}
          </p>
        </section>
      </div>
    </div>
  );
}
