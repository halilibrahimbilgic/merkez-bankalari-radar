import { BANKS, isBankCode } from "@/lib/banks";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import type { BankCode, Meeting } from "@/lib/types";

export const revalidate = 3600;

/**
 * Google Takvim / Outlook için iCalendar akışı.
 * Toplantı anları UTC olarak yazılır; takvim uygulaması kullanıcının
 * kendi saat dilimine çevirir.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("banka") ?? undefined;
  const bankCode: BankCode | undefined = raw && isBankCode(raw) ? raw : undefined;

  const meetings = await getUpcomingMeetings({ bankCode });
  const body = buildIcs(meetings);
  const filename = bankCode ? `${bankCode}-toplantilari.ics` : "merkez-bankalari.ics";

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "public, max-age=3600",
    },
  });
}

function buildIcs(meetings: Meeting[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Merkez Bankalari Radar//TR//",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Merkez Bankası Faiz Kararları",
    "X-WR-TIMEZONE:Europe/Istanbul",
  ];

  for (const m of meetings) {
    const bank = BANKS[m.bankCode];
    const start = new Date(m.meetingAt);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@merkezbankalariradar`,
      `DTSTAMP:${icsTime(new Date())}`,
      ...(m.timeTbd ? allDay(m.meetingAt, bank.timezone) : timed(start)),
      `SUMMARY:${escapeIcs(`${bank.nameTr} faiz kararı`)}`,
      `DESCRIPTION:${escapeIcs(
        `${bank.nameEn} — ${bank.rateNameTr}.` +
          (m.timeTbd ? " Açıklama saati önceden duyurulmuyor." : "") +
          (m.sourceUrl ? ` Kaynak: ${m.sourceUrl}` : ""),
      )}`,
      // Bir gün önce: hazırlık için. Tüm gün etkinliğinde başlangıç yerel gece
      // yarısıdır; -P1D bir önceki günün başına düşer.
      ...alarm("-P1D", `${bank.nameTr} faiz kararı yarın`),
      // Saat belliyse bir saat önce de. Saat belirsizse (BoJ) bu alarm
      // gece yarısına göre çalacağından anlamsız olurdu.
      ...(m.timeTbd ? [] : alarm("-PT1H", `${bank.nameTr} kararına 1 saat kaldı`)),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Faiz kararı anlıktır; takvimde 1 saatlik blok olarak gösterilir. */
function timed(start: Date): string[] {
  const end = new Date(start.getTime() + 3600_000);
  return [`DTSTART:${icsTime(start)}`, `DTEND:${icsTime(end)}`];
}

/**
 * Saat belli değilse (BoJ) tüm gün etkinliği: meetingAt'teki saat yer
 * tutucudur ve takvimde kesin bir saat bloğu sahte kesinlik olurdu. Gün,
 * bankanın kendi saat diliminde alınır (Tokyo'da 18 Eylül, TRT'de de öyle).
 */
function allDay(iso: string, timeZone: string): string[] {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  const next = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return [
    `DTSTART;VALUE=DATE:${day.replace(/-/g, "")}`,
    `DTEND;VALUE=DATE:${next.replace(/-/g, "")}`,
  ];
}

function alarm(trigger: string, text: string): string[] {
  return [
    "BEGIN:VALARM",
    `TRIGGER:${trigger}`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(text)}`,
    "END:VALARM",
  ];
}

function icsTime(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** RFC 5545: satırlar 75 oktetten uzun olamaz. */
function foldLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= 75) return line;
  const chunks: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > 73) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  chunks.push(current);
  return chunks.join("\r\n ");
}
