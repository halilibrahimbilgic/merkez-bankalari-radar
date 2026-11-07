import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";
import { BANKS, bankWithCountryTr } from "@/lib/banks";
import { cpiReferenceMonth } from "@/lib/cpi-release";
import { getEvents } from "@/lib/data/events";
import { getExpectations } from "@/lib/data/expectations";
import { getInflation } from "@/lib/data/inflation";
import { getAllMeetings } from "@/lib/data/meetings";
import { getCurrentRates } from "@/lib/data/rates";
import { decisionSentence } from "@/lib/decision-format";
import { fmtPercent } from "@/lib/i18n";
import { BANK_HEX } from "@/lib/og";
import { SITE_URL } from "@/lib/site";
import { formatTimeTrt, monthLabel, trtDayKey } from "@/lib/time";
import { weekCardItems, weekDayLabel, weekHeadline, weekRangeLabel, type WeekItem } from "@/lib/week-card";
import { expectationText, KIND } from "./WeekAhead";

/**
 * Haftalık paylaşım kartı (LinkedIn, Telegram): /bu-hafta sayfası önizler,
 * /bu-hafta/gorsel.png görseli verir. Yalnızca Türkçe — sitenin büyüme
 * sorunu Türk okura ulaşmak (Kasım 2026: ayda ~40 Türk okur), kartı da
 * site sahibi paylaşıyor. 4:5 dikey: LinkedIn akışında en çok yer tutan oran.
 */
export const WEEK_CARD_SIZE = { width: 1080, height: 1350 };

const C = {
  background: "#0b0d12",
  surface: "#151922",
  border: "#262c39",
  foreground: "#e8eaef",
  muted: "#9aa4b5",
  accent: "#7ea2ff",
};

export interface WeekRow {
  /** "Çar 10 Ara" */
  day: string;
  /** "14:00" ya da "—" (saati duyurulmayan) */
  time: string;
  title: string;
  detail?: string;
  dot?: string;
  decision: boolean;
}

export interface WeekCard {
  /** "7–13 Aralık 2026" */
  range: string;
  decisions: number;
  rows: WeekRow[];
  hidden: number;
  /** Sakin haftada kart boş kalmasın: haftadan sonraki ilk kararlar. */
  later: { day: string; time: string; title: string; dot: string }[];
}

/** Bu sayının altında satır varsa sıradaki kararlar da eklenir. */
const LATER_BELOW = 5;

/** `?hafta=YYYY-MM-DD` geçerliyse o günün sabahı (TRT), değilse şimdi. */
export function weekCardDate(param: string | null | undefined): Date {
  return param && /^\d{4}-\d{2}-\d{2}$/.test(param) && !Number.isNaN(Date.parse(param))
    ? new Date(`${param}T06:00:00Z`)
    : new Date();
}

export async function getWeekCard(now: Date): Promise<WeekCard> {
  const [meetings, events, expectations, rates, inflation] = await Promise.all([
    getAllMeetings(),
    getEvents(),
    getExpectations(),
    getCurrentRates(),
    getInflation(),
  ]);
  const { week, items, hidden } = weekCardItems(meetings, events, now);

  const row = (it: WeekItem): WeekRow => {
    const day = weekDayLabel(it.at);
    if ("meeting" in it) {
      const m = it.meeting;
      const decided = m.decisionRate !== undefined && new Date(m.meetingAt) <= now;
      const rate = rates.find((r) => r.bankCode === m.bankCode)?.rate;
      return {
        day,
        time: m.timeTbd ? "—" : formatTimeTrt(m.meetingAt),
        title: `${bankWithCountryTr(m.bankCode)} faiz kararı`,
        detail: decided
          ? decisionSentence(m, "tr")
          : (expectationText(m, expectations, rate, "tr") ??
            (m.type === "projections" ? "Nokta grafiği (üyelerin faiz tahminleri) de açıklanacak." : undefined)),
        dot: BANK_HEX[m.bankCode],
        decision: true,
      };
    }
    const e = it.event;
    const bank = BANKS[e.bankCode];
    const base = { day, time: e.timeTbd ? "—" : formatTimeTrt(e.at), dot: BANK_HEX[e.bankCode], decision: false };
    if (e.kind === "cpi") {
      const reading = inflation.find((r) => r.bankCode === e.bankCode);
      const released = reading && new Date(e.at) <= now && reading.period >= cpiReferenceMonth(e.at);
      const value = reading && `yıllık ${fmtPercent(reading.yoy, "tr", 1)} (${monthLabel(`${reading.period}-15T12:00:00Z`, "tr")})`;
      return { ...base, title: `${bank.countryTr} enflasyonu (TÜFE)`, detail: value && (released ? `Açıklandı: ${value}` : `Önceki: ${value}`) };
    }
    const kind = KIND[e.kind][0];
    return { ...base, title: `${bank.nameTr} · ${kind}`, detail: e.kind === "testimony" ? e.speaker : undefined };
  };

  const range = weekRangeLabel(week);

  const later = meetings
    .filter((m) => m.status !== "cancelled" && m.type !== "minutes" && trtDayKey(m.meetingAt) >= week.end)
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt))
    .slice(0, Math.min(3, Math.max(0, LATER_BELOW - items.length)))
    .map((m) => ({
      day: weekDayLabel(m.meetingAt),
      time: m.timeTbd ? "—" : formatTimeTrt(m.meetingAt),
      title: `${bankWithCountryTr(m.bankCode)} faiz kararı`,
      dot: BANK_HEX[m.bankCode],
    }));

  return { range, decisions: items.filter((it) => "meeting" in it).length, rows: items.map(row), hidden, later };
}

const headline = (card: WeekCard) => weekHeadline(card.decisions);

export function renderWeekCard(card: WeekCard): ImageResponse {
  const titleSize = 64;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px 64px 56px",
          background: C.background,
          color: C.foreground,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 32, color: C.accent, letterSpacing: 1 }}>{`Merkez bankaları · ${card.range}`}</div>
          <div style={{ fontSize: titleSize, marginTop: 14, lineHeight: 1.1 }}>{headline(card)}</div>
          <div style={{ fontSize: 28, marginTop: 14, color: C.muted }}>Saatler Türkiye saatiyle (TRT)</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 24,
            padding: "8px 32px",
          }}
        >
          {card.rows.length === 0 ? (
            <div style={{ display: "flex", fontSize: 32, color: C.muted, padding: "28px 0" }}>
              Bu hafta takvimde karar ya da önemli yayın görünmüyor.
            </div>
          ) : (
            card.rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  padding: "20px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", width: 190, flexShrink: 0 }}>
                  <div style={{ fontSize: 28, color: C.muted }}>{r.day}</div>
                  <div style={{ fontSize: 36, marginTop: 2 }}>{r.time}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", fontSize: r.decision ? 36 : 32 }}>
                    {r.dot && (
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: r.dot, marginRight: 14, flexShrink: 0 }} />
                    )}
                    <span style={{ color: r.decision ? C.foreground : C.muted }}>{r.title}</span>
                  </div>
                  {r.detail && <div style={{ fontSize: 26, marginTop: 6, color: C.muted, lineHeight: 1.3 }}>{r.detail}</div>}
                </div>
              </div>
            ))
          )}
          {card.hidden > 0 && (
            <div style={{ display: "flex", fontSize: 26, color: C.muted, padding: "0 0 18px 190px" }}>
              {`+${card.hidden} yayın daha · programın tamamı sitede`}
            </div>
          )}
        </div>

        {card.later.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
            <div style={{ fontSize: 30, color: C.muted, marginBottom: 8 }}>Sıradaki kararlar</div>
            {card.later.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 30, padding: "12px 0" }}>
                <div style={{ display: "flex", width: 222, color: C.muted }}>{r.day}</div>
                <div style={{ display: "flex", width: 110 }}>{r.time}</div>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: r.dot, marginRight: 14 }} />
                <div style={{ display: "flex" }}>{r.title}</div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            fontSize: 26,
            color: C.muted,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 40, color: C.foreground }}>
            <LogoMark size={48} />
            <span style={{ marginLeft: 16 }}>Faiz</span>
            <span style={{ color: C.accent, marginLeft: 8 }}>Radar</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 30, color: C.foreground }}>faizradar.com</span>
            <span>Yatırım tavsiyesi değildir.</span>
          </div>
        </div>
      </div>
    ),
    WEEK_CARD_SIZE,
  );
}

/** LinkedIn'e yapıştırılacak metin; bağlantı kaynak etiketiyle (Vercel'de "UTM Parameters"). */
export function weekPostText(card: WeekCard): string {
  const lines = card.rows.map((r) => {
    const when = r.time === "—" ? r.day : `${r.day} ${r.time}`;
    return `• ${when} — ${r.title}${r.detail ? `\n   ${r.detail}` : ""}`;
  });
  return [
    `${headline(card)} (${card.range}), Türkiye saatiyle:`,
    "",
    ...(lines.length > 0 ? lines : ["Takvimde karar ya da önemli yayın yok."]),
    ...(card.later.length > 0
      ? ["", "Sıradaki kararlar:", ...card.later.map((r) => `• ${r.time === "—" ? r.day : `${r.day} ${r.time}`} — ${r.title}`)]
      : []),
    "",
    "Kararlar açıklandığı anda sonuç, beklentiyle kıyas ve karar metnindeki değişiklik:",
    `${SITE_URL}/?utm_source=linkedin`,
    "",
    "#faiz #merkezbankası #TCMB #Fed #ECB",
  ].join("\n");
}
