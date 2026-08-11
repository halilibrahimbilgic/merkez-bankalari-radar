/**
 * Bir zaman diliminde okunan duvar saatini (ör. "Fed kararı 14:00 New York")
 * kesin UTC anına çevirir. Yaz saati geçişleri Intl'in kendi kurallarıyla
 * çözülür; ayrıca DST tablosu tutmaya gerek kalmaz.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // Duvar saatini önce UTC'ymiş gibi al, sonra o andaki gerçek ofsetle düzelt.
  // Ofset DST sınırında değişebildiği için düzeltme iki kez uygulanır.
  let ts = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const offset = tzOffsetMs(new Date(ts), timeZone);
    const corrected = Date.UTC(year, month - 1, day, hour, minute) - offset;
    if (corrected === ts) break;
    ts = corrected;
  }
  return new Date(ts);
}

/** Verilen andaki zaman dilimi ofseti, milisaniye (UTC+3 → +10800000). */
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  // Saniye altı farkı ele: kaynak tarihin ms'i formatta yok.
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}
