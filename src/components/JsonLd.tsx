import { serializeJsonLd } from "@/lib/json-ld";

/** Sunucu bileşeni: JSON-LD bloğu. Birden çok nesne ayrı bloklar olarak basılır. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <>
      {(Array.isArray(data) ? data : [data]).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(d) }} />
      ))}
    </>
  );
}
