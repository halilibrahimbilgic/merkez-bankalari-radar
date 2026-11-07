/**
 * Faiz Radar Telegram kanalına karar hatırlatması ve karar sonucu yazar.
 *
 *   npm run telegram:post              # gönderilecekleri gönderir
 *   npm run telegram:post -- --dry-run # yalnızca ekrana yazar
 *   npm run telegram:post -- --welcome # yaklaşan kararların listesini gönderir
 *   npm run telegram:post -- --news    # önemli haberler (news.yml, 30 dk'da bir)
 *   npm run telegram:post -- --dry-run --now=2026-12-07T05:00:00Z  # pazartesi: haftalık kart
 *   npm run telegram:post -- --dry-run --now=2026-10-21T05:00:00Z  # başka bir sabahı dene
 *
 * TELEGRAM_BOT_TOKEN (secret) ve TELEGRAM_CHAT_ID (ör. "@faizradar") gerekir;
 * biri yoksa adım sessizce atlanır, günlük işi düşürmez.
 *
 * Günlük iş 08:00 TRT'de bir kez çalışır. RBA ve BoJ kararları o saatten önce
 * açıklandığı için "bugün" hatırlatması geç kalırdı; bu yüzden hatırlatma
 * karardan bir gün önce atılır. Sonuç, karar oranı fetch:rates ile arşive
 * düşünce (genellikle ertesi sabah) atılır.
 *
 * Pazartesi sabahı haftanın programı kanala görsel olarak gider: görseli
 * Telegram sitenin /bu-hafta/gorsel.png adresinden kendisi indirir, altyazı
 * kararların listesi. Sakin haftada da gider ("faiz kararı yok" + sıradaki).
 *
 * Gönderilenler data/telegram/posted.json'da tutulur ve cron tarafından
 * commit'lenir — kanal aynı mesajı iki kez görmez. Durum her başarılı
 * gönderimden sonra yazılır: yarıda kesilen bir koşu tekrar göndermez.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { BANKS } from "../src/lib/banks";
import { num, resultTitle, whenTr } from "../src/lib/announce";
import type { NewsStore } from "../src/lib/news";
import { SITE_URL } from "../src/lib/site";
import { formatMeeting, formatTimeTrt, trtDayKey } from "../src/lib/time";
import type { BankCode, Meeting } from "../src/lib/types";
import type { CalendarEvent } from "../src/lib/sources/speaking-calendars";
import { bankWithCountryTr } from "../src/lib/banks";
import { trtWeek, weekCardItems, weekDayLabel, weekHeadline, weekRangeLabel } from "../src/lib/week-card";
import { loadNewsStore } from "./news-store";

// Kanaldan gelen okur Vercel'de görünsün: Telegram'ın uygulama içi tarayıcısı
// kaynak (referrer) göndermiyor, ziyaret "doğrudan" sayılıyordu. Kanonik
// adres etiketsiz olduğu için arama motoru için ayrı sayfa doğmaz.
const siteLink = (path: string) => `${SITE_URL}${path}?utm_source=telegram`;

config({ path: ".env.local", quiet: true });

const MEETINGS = path.join(process.cwd(), "data", "seed", "meetings.json");
const RATES = path.join(process.cwd(), "data", "seed", "current-rates.json");
const EVENTS = path.join(process.cwd(), "data", "seed", "events.json");
const STATE = path.join(process.cwd(), "data", "telegram", "posted.json");

/** Bundan eski kararların sonucu gönderilmez — kanal eski haberle dolmasın. */
const RESULT_MAX_AGE_DAYS = 4;
const DAY = 86_400_000;

interface CurrentRate {
  bankCode: BankCode;
  rate: number;
  rateLower?: number;
}

interface State {
  /** Mesaj anahtarı → gönderildiği an (ISO). */
  posted: Record<string, string>;
}

interface Post {
  key: string;
  text: string;
  link: string;
  /** Varsa mesaj görsel olarak gider, metin altyazı olur (en çok 1024 karakter). */
  photo?: string;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const welcome = process.argv.includes("--welcome");
  // Yapıştırırken araya giren boşluk/satır sonu 404 üretiyordu.
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!dryRun && (!token || !chatId)) {
    console.log("TELEGRAM_BOT_TOKEN ya da TELEGRAM_CHAT_ID yok — Telegram adımı atlandı.");
    return;
  }
  // Token'ın kendisi asla yazdırılmaz; yalnızca biçimi denetlenir.
  if (token && !/^\d+:[\w-]{30,}$/.test(token)) {
    throw new Error(
      `TELEGRAM_BOT_TOKEN biçimi beklenen "123456789:AA..." değil ` +
        `(uzunluk ${token.length}, iki nokta ${token.includes(":") ? "var" : "yok"}, ` +
        `boşluk ${/\s/.test(token) ? "var" : "yok"}).`,
    );
  }

  const { meetings } = JSON.parse(await readFile(MEETINGS, "utf8")) as { meetings: Meeting[] };
  const { rates } = JSON.parse(await readFile(RATES, "utf8")) as { rates: CurrentRate[] };
  const state = await readState();
  const nowArg = process.argv.find((a) => a.startsWith("--now="))?.slice(6);
  const now = nowArg ? new Date(nowArg) : new Date();

  const news = process.argv.includes("--news");
  const posts = welcome
    ? [welcomePost(meetings, now)]
    : news
      ? newsPosts(await loadNewsStore(), state, now)
      : // Hatırlatmalar önce: görsel gönderimi takılırsa onlar gitmiş olsun.
        [...duePosts(meetings, rates, state, now), ...weeklyPost(meetings, await readEvents(), state, now)];
  if (posts.length === 0) {
    console.log("Gönderilecek mesaj yok.");
    return;
  }

  for (const post of posts) {
    if (dryRun) {
      console.log(`--- ${post.key}${post.photo ? ` [görsel: ${post.photo}]` : ""}\n${post.text}\n`);
      continue;
    }
    try {
      await send(token!, chatId!, post);
    } catch (err) {
      // Telegram görseli siteden indiremezse program yine gitsin: düz metin.
      if (!post.photo) throw err;
      console.error(`Görsel gönderilemedi (${(err as Error).message}); metin olarak gönderiliyor.`);
      await send(token!, chatId!, { ...post, photo: undefined });
    }
    state.posted[post.key] = now.toISOString();
    await writeState(state);
    console.log(`Gönderildi: ${post.key}`);
    // Telegram kanal başına dakikada ~20 mesaj sınırı; arka arkaya göndermeyelim.
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/** Haberde en fazla bu kadar geç kalınmış öğe kanala gider — eski haber bildirim değildir. */
const NEWS_MAX_AGE_HOURS = 12;
/** Koşu başına üst sınır: yoğun bir günde kanalın sel olmaması için. */
const NEWS_MAX_PER_RUN = 4;

/** Modelin "önemli" dediği, henüz gönderilmemiş, taze haberler — eskiden yeniye. */
function newsPosts(store: NewsStore, state: State, now: Date): Post[] {
  const cutoff = now.getTime() - NEWS_MAX_AGE_HOURS * 3600_000;
  return store.items
    .filter((i) => i.important && !state.posted[`news-${i.id}`] && Date.parse(i.publishedAt) >= cutoff)
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
    .slice(-NEWS_MAX_PER_RUN)
    .map((i) => ({
      key: `news-${i.id}`,
      link: i.url,
      text: [
        `<b>${esc(i.titleTr)}</b>`,
        esc(i.summaryTr),
        "",
        `${esc(i.sourceName)} · <a href="${esc(i.url)}">kaynak</a> · <a href="${siteLink("/haberler")}">Faiz Radar</a>`,
      ].join("\n"),
    }));
}

function duePosts(meetings: Meeting[], rates: CurrentRate[], state: State, now: Date): Post[] {
  const today = trtDayKey(now.toISOString());
  const tomorrow = trtDayKey(new Date(now.getTime() + DAY).toISOString());
  const posts: Post[] = [];

  for (const m of [...meetings].sort((a, b) => a.meetingAt.localeCompare(b.meetingAt))) {
    if (m.status === "cancelled") continue;
    const at = Date.parse(m.meetingAt);
    const bank = BANKS[m.bankCode];
    const link = siteLink(`/banka/${m.bankCode}`);
    const day = trtDayKey(m.meetingAt);

    // Bir gün önce; o gün kaçtıysa (cron çalışmadıysa) karar henüz
    // açıklanmamışsa aynı gün. Anahtar ikisinde de aynı: tek hatırlatma.
    const reminderKey = `${m.id}-hatirlatma`;
    if (at > now.getTime() && (day === tomorrow || day === today) && !state.posted[reminderKey]) {
      const current = rates.find((r) => r.bankCode === m.bankCode);
      const lines = [
        `<b>${day === today ? "Bugün" : "Yarın"}: ${esc(bank.nameTr)} faiz kararı</b>`,
        esc(formatMeeting(m.meetingAt, m.timeTbd)),
      ];
      if (current) {
        const rate =
          current.rateLower === undefined
            ? `%${num(current.rate)}`
            : `%${num(current.rateLower)}–${num(current.rate)}`;
        lines.push("", `${esc(bank.rateNameTr)} şu an: ${rate}`);
      }
      lines.push("", `<a href="${link}">${esc(bank.nameTr)} sayfası</a>`);
      posts.push({ key: reminderKey, text: lines.join("\n"), link });
    }

    const resultKey = `${m.id}-karar`;
    if (
      m.decisionRate !== undefined &&
      m.previousRate !== undefined &&
      at <= now.getTime() &&
      now.getTime() - at <= RESULT_MAX_AGE_DAYS * DAY &&
      !state.posted[resultKey]
    ) {
      const lines = [
        `<b>${esc(resultTitle(m))}</b>`,
        `${esc(whenTr(m))} · önceki oran %${num(m.previousRate)}`,
        "",
        `<a href="${link}">${esc(bank.nameTr)} sayfası</a>`,
      ];
      posts.push({ key: resultKey, text: lines.join("\n"), link });
    }
  }
  return posts;
}

/**
 * Pazartesi (TRT) haftanın programı: /bu-hafta kartının görseli ve altyazıda
 * kararlar. Yalnızca pazartesi — salı atılan "bu hafta" mesajı geç kalmış olur.
 */
function weeklyPost(meetings: Meeting[], events: CalendarEvent[], state: State, now: Date): Post[] {
  const today = trtDayKey(now.toISOString());
  const week = trtWeek(now);
  const key = `hafta-${week.start}`;
  if (today !== week.start || state.posted[key]) return [];

  const { items } = weekCardItems(meetings, events, now);
  const decisions = items.flatMap((it) => ("meeting" in it ? [it.meeting] : []));
  const when = (m: Meeting) => `${weekDayLabel(m.meetingAt)}${m.timeTbd ? "" : ` ${formatTimeTrt(m.meetingAt)}`}`;
  const later =
    decisions.length > 0
      ? []
      : meetings
          .filter((m) => m.status !== "cancelled" && m.type !== "minutes" && trtDayKey(m.meetingAt) >= week.end)
          .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt))
          .slice(0, 3);
  const link = siteLink("/");
  const lines = [
    `<b>${esc(weekHeadline(decisions.length))}</b> · ${esc(weekRangeLabel(week))}, Türkiye saatiyle`,
    "",
    ...decisions.map((m) => `• ${esc(when(m))} — ${esc(bankWithCountryTr(m.bankCode))}`),
    ...(later.length > 0 ? ["Sıradaki kararlar:", ...later.map((m) => `• ${esc(when(m))} — ${esc(bankWithCountryTr(m.bankCode))}`)] : []),
    "",
    `Beklentiler ve haftanın programı: <a href="${link}">faizradar.com</a> · Yatırım tavsiyesi değildir.`,
  ];
  // Adreste hafta: Telegram görseli adrese göre önbelleğe alıyor.
  const photo = `${SITE_URL}/bu-hafta/gorsel.png?hafta=${week.start}`;
  return [{ key, text: lines.join("\n"), link, photo }];
}

async function readEvents(): Promise<CalendarEvent[]> {
  try {
    return (JSON.parse(await readFile(EVENTS, "utf8")) as { events: CalendarEvent[] }).events;
  } catch {
    return [];
  }
}

/** Kanalın ilk mesajı ve bağlantı denemesi: yaklaşan beş karar. */
function welcomePost(meetings: Meeting[], now: Date): Post {
  const upcoming = meetings
    .filter((m) => m.status !== "cancelled" && Date.parse(m.meetingAt) > now.getTime())
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt))
    .slice(0, 5);
  const link = siteLink("/takvim");
  const lines = [
    "<b>Faiz Radar</b>",
    "Fed, ECB, TCMB, BoE, BoJ ve RBA faiz kararları, Türkiye saatiyle. " +
      "Her karardan bir gün önce hatırlatma, açıklanınca sonuç bu kanala düşer.",
    "",
    "<b>Yaklaşan kararlar</b>",
    ...upcoming.map((m) => `• ${esc(BANKS[m.bankCode].nameTr)} — ${esc(whenTr(m))}`),
    "",
    `<a href="${link}">Tüm takvim</a> · Yatırım tavsiyesi değildir.`,
  ];
  return { key: "welcome", text: lines.join("\n"), link };
}

async function send(token: string, chatId: string, post: Post) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${post.photo ? "sendPhoto" : "sendMessage"}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      post.photo
        ? { chat_id: chatId, photo: post.photo, caption: post.text, parse_mode: "HTML" }
        : {
            chat_id: chatId,
            text: post.text,
            parse_mode: "HTML",
            // Önizleme sitenin paylaşım kartını (opengraph-image) gösterir.
            link_preview_options: { url: post.link, prefer_large_media: true },
          },
    ),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  // Token URL'de olduğu için hata mesajına adres yazılmaz.
  if (!res.ok || !body.ok) throw new Error(`Telegram ${res.status}: ${body.description ?? "bilinmeyen hata"}`);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function readState(): Promise<State> {
  try {
    return JSON.parse(await readFile(STATE, "utf8")) as State;
  } catch {
    return { posted: {} };
  }
}

async function writeState(state: State) {
  await mkdir(path.dirname(STATE), { recursive: true });
  await writeFile(STATE, JSON.stringify(state, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
