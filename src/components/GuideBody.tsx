import Link from "next/link";
import type { ReactNode } from "react";
import { pick, termId, type GuideBlock } from "@/lib/guides";
import { localePath, type Lang } from "@/lib/i18n";
import { Callout } from "./ui";

/** Rehber yazısının gövdesi. Biçim kuralları: src/lib/guides.ts. */
export function GuideBody({ blocks, lang }: { blocks: GuideBlock[]; lang: Lang }) {
  return (
    <div className="prose-width space-y-4 leading-relaxed">
      {blocks.map((block, i) => {
        if ("h" in block) {
          return (
            <h2 key={i} className="pt-2 text-lg font-semibold">
              {pick(block.h, lang)}
            </h2>
          );
        }
        if ("p" in block) return <p key={i}>{inline(pick(block.p, lang), lang)}</p>;
        if ("ul" in block) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {(lang === "en" ? block.ul.en : block.ul.tr).map((item, j) => (
                <li key={j}>{inline(item, lang)}</li>
              ))}
            </ul>
          );
        }
        if ("note" in block) return <Callout key={i}>{inline(pick(block.note, lang), lang)}</Callout>;
        return (
          <dl key={i} className="space-y-3">
            {block.terms.map((t, j) => (
              // Çapa: sayfalardaki terim bağlantıları (Term) buraya iner; hedef vurgulanır.
              <div key={j} id={termId(t.term)} className="-mx-2 scroll-mt-4 rounded-lg px-2 py-1 target:bg-accent-soft">
                <dt className="font-semibold">{pick(t.term, lang)}</dt>
                <dd className="text-muted">{inline(pick(t.def, lang), lang)}</dd>
              </div>
            ))}
          </dl>
        );
      })}
    </div>
  );
}

/** **kalın** ve [metin](/yol) — başka biçim yok. */
function inline(text: string, lang: Lang): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={key++}>{m[1]}</strong>);
    } else {
      // Yol + isteğe bağlı çapa: "/faiz-olasiligi#boe" → dil öneki yola eklenir.
      const [path, hash] = m[3].split("#");
      out.push(
        <Link key={key++} href={`${localePath(lang, path)}${hash ? `#${hash}` : ""}`} className="text-accent hover:underline">
          {m[2]}
        </Link>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
