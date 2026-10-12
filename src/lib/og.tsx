import { ImageResponse } from "next/og";
import type { BankCode } from "./types";

/**
 * Paylaşım önizleme kartı (Telegram, X, WhatsApp, LinkedIn).
 *
 * Görsel motoru (Satori) CSS değişkeni bilmez; değerler globals.css'teki koyu
 * temanın aynısıdır — akışlarda koyu kart daha iyi ayrışır. Yazı tipi
 * next/og'un gömülü Geist-Regular'ı: Türkçe karakterlerin hepsini içerdiği
 * render edilerek doğrulandı (12 Ekim 2026). Yalnızca normal kalınlık var;
 * hiyerarşi boyut ve renkle kurulur.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const C = {
  background: "#0b0d12",
  surface: "#151922",
  border: "#262c39",
  foreground: "#e8eaef",
  muted: "#9aa4b5",
  accent: "#7ea2ff",
  hawk: "#f87171",
  dove: "#4ade80",
};

export const BANK_HEX: Record<BankCode, string> = {
  fed: "#a5b4fc",
  ecb: "#5eead4",
  tcmb: "#fbbf24",
  boe: "#c4b5fd",
  boj: "#f0abfc",
  rba: "#7dd3fc",
};

export function scoreHex(score: number): string {
  return score > 0 ? C.hawk : score < 0 ? C.dove : C.muted;
}

export interface OgRow {
  label: string;
  value: string;
  /** Satırın başındaki renkli nokta (banka rengi). */
  dot?: string;
  valueColor?: string;
}

export function renderOgCard(opts: {
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  rows?: OgRow[];
  footer?: string;
}): ImageResponse {
  const { eyebrow, eyebrowColor = C.accent, title, rows = [], footer } = opts;
  // Uzun başlıklar (konuşma adları) taşmasın: boyut başlık uzunluğuna göre.
  const titleSize = title.length > 70 ? 46 : title.length > 40 ? 56 : 68;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: C.background,
          color: C.foreground,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: eyebrowColor, letterSpacing: 1 }}>{eyebrow}</div>
          <div style={{ fontSize: titleSize, marginTop: 16, lineHeight: 1.15 }}>{title}</div>
        </div>

        {rows.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              padding: "20px 28px",
            }}
          >
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 34,
                  padding: "10px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", color: C.muted }}>
                  {r.dot && (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        background: r.dot,
                        marginRight: 16,
                      }}
                    />
                  )}
                  {r.label}
                </div>
                <div style={{ color: r.valueColor ?? C.foreground }}>{r.value}</div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: 28,
            color: C.muted,
          }}
        >
          <div style={{ display: "flex", fontSize: 36, color: C.foreground }}>
            Faiz<span style={{ color: C.accent, marginLeft: 8 }}>Radar</span>
          </div>
          <div>{footer ?? "faizradar.com · Türkiye saatiyle"}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
