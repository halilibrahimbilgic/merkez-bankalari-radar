import type { Guide } from "../guides";
import { guide as beklenti } from "./beklenti-nasil-olculur";
import { guide as faizDegisince } from "./faiz-degisince-ne-olur";
import { guide as faizKarari } from "./faiz-karari-nasil-okunur";
import { guide as reelFaiz } from "./reel-faiz-nedir";
import { guide as sozluk } from "./sozluk";

/** Dizindeki sıra: önce temel okuma, sonra mekanizma, ölçüm ve sözlük. */
export const GUIDES: Guide[] = [faizKarari, faizDegisince, reelFaiz, beklenti, sozluk];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
