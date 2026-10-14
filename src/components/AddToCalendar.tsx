import { googleCalendarUrl, meetingIcsHref } from "@/lib/calendar-links";
import { L, type Lang } from "@/lib/i18n";
import type { Meeting } from "@/lib/types";

/** Sıradaki toplantıyı tek tıkla takvime ekler: Google ya da .ics (Apple Takvim, Outlook). */
export function AddToCalendar({ meeting, lang, className = "" }: { meeting: Meeting; lang: Lang; className?: string }) {
  const t = L(lang);
  return (
    <div className={`flex flex-wrap items-center gap-x-3 text-sm ${className}`}>
      <span className="text-muted">{t("Takvime ekle:", "Add to calendar:")}</span>
      <a
        href={googleCalendarUrl(meeting, lang)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex min-h-6 items-center text-accent hover:underline"
      >
        Google
      </a>
      <a href={meetingIcsHref(meeting)} className="inline-flex min-h-6 items-center text-accent hover:underline">
        Apple/Outlook
      </a>
    </div>
  );
}
