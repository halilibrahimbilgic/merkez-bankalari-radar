import type { ReactNode } from "react";
import { termId } from "@/lib/guides";
import { guide as glossary } from "@/lib/guides/sozluk";
import { localePath, type Lang } from "@/lib/i18n";

const IDS = new Set(glossary.blocks.flatMap((b) => ("terms" in b ? b.terms.map((t) => termId(t.term)) : [])));

/**
 * Jargonun sayfadaki ilk geçişi sözlükteki tanımına bağlanır. Noktalı alt
 * çizgi: metnin parçası olduğu belli olsun, asıl bağlantılarla karışmasın.
 * Sözlükte olmayan çapa derlemeyi kırar — kırık bağlantı yayına çıkmasın.
 * Düz <a>: istemci tarafı gezinme pushState kullanır ve :target vurgusu
 * tetiklenmez; tam yükleme terime kaydırır ve vurgular.
 */
export function Term({ id, lang, children }: { id: string; lang: Lang; children: ReactNode }) {
  if (!IDS.has(id)) throw new Error(`Sözlükte böyle bir terim yok: ${id}`);
  return (
    <a
      href={`${localePath(lang, "/rehber/sozluk")}#${id}`}
      className="underline decoration-dotted underline-offset-2 hover:text-accent"
    >
      {children}
    </a>
  );
}
