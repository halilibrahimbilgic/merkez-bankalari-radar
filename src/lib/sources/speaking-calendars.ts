import { zonedWallTimeToUtc } from "../tz";
import type { BankCode } from "../types";
import { decodeEntities, fetchText, stripTags, UA } from "./shared";

/**
 * Önümüzdeki konuşmalar ve yayınlar — "Bu hafta" bölümü için.
 *
 *   Fed  Yönetim Kurulu takvimi (federalreserve.gov/json/calendar.json): Board
 *        üyelerinin konuşmaları ve Kongre sunumları, FOMC tutanakları, Bej
 *        Kitap. Saatler New York saatiyle ("11:30 p.m."). Bölgesel Fed
 *        başkanları bu takvimde yok.
 *   ECB  Yönetim Kurulu'nun haftalık programı (yalnızca bu haftayı gösterir):
 *        "Board member:" satırı olan ya da metinde Başkan'ı anan konuşma,
 *        panel ve parlamento sunumları. Saatler Frankfurt saatiyle; kaynak
 *        yaz saatinde de "CET" yazıyor.
 *
 * Diğer bankalar ileriye dönük konuşma takvimini makinece okunur biçimde
 * yayımlamıyor (13 Ekim 2026'da bakıldı). Etkinlik adları kaynağın dilinde
 * (İngilizce) saklanır; sayfada lang="en" ile gösterilir.
 */

/** "cpi": bir ekonominin enflasyon verisi açıklaması (release-calendars.ts). */
export type EventKind = "speech" | "discussion" | "testimony" | "minutes" | "beige-book" | "cpi";

export interface CalendarEvent {
  id: string;
  bankCode: BankCode;
  /** UTC ISO; saat belli değilse gün başı + timeTbd. */
  at: string;
  timeTbd: boolean;
  kind: EventKind;
  /** "Christopher J. Waller" — yayın türlerinde yok. */
  speaker?: string;
  /** Kaynaktaki unvan, İngilizce: "Governor", "President". */
  role?: string;
  /** Etkinliğin kaynaktaki adı/yeri (İngilizce). */
  title: string;
  /** Veri açıklamalarında referans dönem ("Ekim 2026"), kaynak veriyorsa. */
  period?: string;
  url?: string;
}

export const FED_CALENDAR_URL = "https://www.federalreserve.gov/newsevents/calendar.htm";
const FED_JSON = "https://www.federalreserve.gov/json/calendar.json";
export const ECB_WEEKLY_URL = "https://www.ecb.europa.eu/press/calendars/weekly/html/index.en.html";

const FED_ROLES = ["Vice Chair for Supervision", "Vice Chair", "Chairman", "Chair", "Governor"];

function eventId(bank: BankCode, at: string, text: string): string {
  let h = 0;
  for (const c of text) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return `${bank}-${at.slice(0, 10)}-${h.toString(36)}`;
}

/** "11:30 p.m." → [23, 30]; tanınmazsa undefined. */
export function parseUsTime(s: string | undefined): [number, number] | undefined {
  const m = s?.trim().match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);
  if (!m) return undefined;
  const h = Number(m[1]) % 12 + (m[3].toLowerCase() === "p" ? 12 : 0);
  return [h, Number(m[2])];
}

interface FedRaw {
  title?: string;
  type?: string;
  month?: string;
  days?: string;
  time?: string;
  location?: string;
  link?: string;
}

/** Fed takvim JSON'u → [from, to] aralığındaki konuşma ve yayınlar. */
export function parseFedCalendar(json: unknown, from: string, to: string): CalendarEvent[] {
  const events = (json as { events?: FedRaw[] }).events;
  if (!Array.isArray(events)) throw new Error("Fed takvimi: events alanı yok");
  const out: CalendarEvent[] = [];
  for (const e of events) {
    const title = decodeEntities(e.title ?? "").trim();
    let kind: EventKind | undefined;
    let speaker: string | undefined;
    let role: string | undefined;
    if (e.type === "Speeches" || e.type === "Testimony") {
      // "Speech - Governor Christopher J. Waller", "Testimony -- Chair Jerome H. Powell"
      const [head, rest = ""] = title.split(/\s*-{1,2}\s*/);
      kind = /testimony/i.test(head) || e.type === "Testimony" ? "testimony" : /speech/i.test(head) ? "speech" : "discussion";
      const person = rest.trim();
      role = FED_ROLES.find((r) => person.startsWith(`${r} `));
      speaker = role ? person.slice(role.length).trim() : person || undefined;
    } else if (e.type === "FOMC" && /minutes/i.test(title)) {
      kind = "minutes";
    } else if (e.type === "Beige") {
      kind = "beige-book";
    }
    if (!kind || !e.month || !e.days) continue;

    for (const d of e.days.split(",").map((x) => x.trim()).filter(Boolean)) {
      const day = `${e.month}-${d.padStart(2, "0")}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < from || day > to) continue;
      const [y, mo, da] = day.split("-").map(Number);
      const hm = parseUsTime(e.time);
      const at = zonedWallTimeToUtc(y, mo, da, hm?.[0] ?? 0, hm?.[1] ?? 0, "America/New_York").toISOString();
      out.push({
        id: eventId("fed", day, title),
        bankCode: "fed",
        at,
        timeTbd: !hm,
        kind,
        speaker,
        role: role === "Chairman" ? "Chair" : role,
        title: kind === "minutes" ? "FOMC Minutes" : kind === "beige-book" ? "Beige Book" : decodeEntities(e.location ?? "").trim() || title,
        url: e.link?.startsWith("http") ? e.link : FED_CALENDAR_URL,
      });
    }
  }
  return out;
}

const EN_MONTHS: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

/**
 * ECB haftalık programı: <dt>Tuesday, 13 October 2026</dt><dd>Board member:
 * …<br>Event: …<br>Time: 12:15 CET</dd>. İstatistik yayınları gibi kişisiz
 * kalemler ve konuşma içermeyen katılımlar atlanır.
 */
export function parseEcbWeekly(html: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const m of html.matchAll(/<dt>\s*\w+,\s+(\d{1,2}) (\w+) (\d{4})\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) {
    const month = EN_MONTHS[m[2]];
    if (!month) continue;
    const body = m[4];
    const field = (name: string) =>
      body.match(new RegExp(`<strong>${name}:</strong>([\\s\\S]*?)<br`, "i"))?.[1];
    const event = stripTags(field("Event") ?? "");
    if (!event) continue;
    const member = stripTags(field("Board member") ?? "");
    const president = /\bMs Lagarde\b/.test(event);
    if (!member && !president) continue;

    const kind: EventKind | undefined = /hearing|testimony|European Parliament|ECON/i.test(event)
      ? "testimony"
      : /speech|keynote|lecture|remarks|address|introductory statement/i.test(event)
        ? "speech"
        : /panel|discussion|fireside|conversation|interview|Q&A|dialogue/i.test(event)
          ? "discussion"
          : undefined;
    if (!kind) continue;

    const time = stripTags(field("Time") ?? "").match(/(\d{1,2}):(\d{2})/);
    const [y, d] = [Number(m[3]), Number(m[1])];
    const at = zonedWallTimeToUtc(y, month, d, time ? Number(time[1]) : 0, time ? Number(time[2]) : 0, "Europe/Berlin").toISOString();
    const href = field("Event")?.match(/href="([^"]+)"/)?.[1];
    out.push({
      id: eventId("ecb", at, event),
      bankCode: "ecb",
      at,
      timeTbd: !time,
      kind,
      speaker: member || "Christine Lagarde",
      // Programda Yönetim ve Denetim Kurulu üyelerinin hepsi "Board member";
      // unvan yalnızca Başkan için kesin.
      role: /Lagarde/.test(member || "Lagarde") ? "President" : undefined,
      title: event,
      url: href ? decodeEntities(href) : ECB_WEEKLY_URL,
    });
  }
  return out;
}

export async function fetchFedEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const res = await fetch(FED_JSON, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Fed takvimi → HTTP ${res.status}`);
  // Dosya UTF-8 BOM ile başlıyor; res.json() onu tolere etmiyor.
  return parseFedCalendar(JSON.parse((await res.text()).replace(/^﻿/, "")), from, to);
}

export async function fetchEcbEvents(): Promise<CalendarEvent[]> {
  return parseEcbWeekly(await fetchText(ECB_WEEKLY_URL));
}
