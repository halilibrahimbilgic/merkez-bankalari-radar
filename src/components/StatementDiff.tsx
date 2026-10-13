import { L, type Lang } from "@/lib/i18n";
import type { TextDiff } from "@/lib/text-diff";

/**
 * Karar metninin bir öncekine göre farkı. Eklenen metin altı çizili, silinen
 * üstü çizili — renk ikincil ipucu (WCAG 1.4.1). Ekran okuyucular ins/del'i
 * çoğunlukla duyurmadığı için başlarına görünmez bir etiket eklenir.
 */
export function StatementDiff({ diff, lang, textLang }: { diff: TextDiff; lang: Lang; textLang: Lang }) {
  const t = L(lang);
  return (
    <div lang={textLang} className="prose-width space-y-4 leading-relaxed text-foreground">
      {diff.paragraphs.map((para, i) => (
        <p key={i}>
          {para.map((seg, j) => {
            const space = j > 0 ? " " : "";
            if (seg.op === "same") return <span key={j}>{space}{seg.text}</span>;
            if (seg.op === "ins") {
              return (
                <span key={j}>
                  {space}
                  <ins className="rounded-sm bg-dove/15 text-foreground underline decoration-dove decoration-2 underline-offset-2">
                    <span lang={lang} className="sr-only">{t("[eklendi: ", "[added: ")}</span>
                    {seg.text}
                    <span className="sr-only">]</span>
                  </ins>
                </span>
              );
            }
            return (
              <span key={j}>
                {space}
                <del className="rounded-sm bg-hawk/10 text-muted decoration-hawk decoration-2">
                  <span lang={lang} className="sr-only">{t("[silindi: ", "[removed: ")}</span>
                  {seg.text}
                  <span className="sr-only">]</span>
                </del>
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
