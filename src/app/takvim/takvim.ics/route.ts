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
    // Faiz kararı anlıktır; takvimde 1 saatlik blok olarak gösterilir.
    const end = new Date(start.getTime() + 3600_000);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@merkezbankalariradar`,
      `DTSTAMP:${icsTime(new Date())}`,
      `DTSTART:${icsTime(start)}`,
      `DTEND:${icsTime(end)}`,
      `SUMMARY:${escapeIcs(`${bank.nameTr} faiz kararı`)}`,
      `DESCRIPTION:${escapeIcs(
        `${bank.nameEn} — ${bank.rateNameTr}.` +
          (m.sourceUrl ? ` Kaynak: ${m.sourceUrl}` : ""),
      )}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(`${bank.nameTr} kararına 1 saat kaldı`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
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
