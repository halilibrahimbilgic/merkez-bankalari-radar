import { NextResponse, type NextRequest } from "next/server";
import { legacyFilterPath } from "@/lib/filter-paths";

/**
 * Eski sorgulu filtre adreslerini (?banka=tcmb) yeni yola kalıcı yönlendirir.
 * next.config redirects() sorguyu hedefe geri eklediği için burada.
 * Matcher yalnızca o sorguyu taşıyan istekleri getirir: sorgusuz /takvim
 * proxy'ye hiç uğramaz, CDN'den döner.
 */
export function proxy(request: NextRequest) {
  const target = legacyFilterPath(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (!target) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  return NextResponse.redirect(url, 308);
}

// Sabit olmalı (derlemede statik okunur); yollar filter-paths.ts ile aynı.
export const config = {
  matcher: [
    { source: "/(takvim|kararlar|konusmalar)", has: [{ type: "query", key: "banka" }] },
    { source: "/en/(takvim|kararlar|konusmalar)", has: [{ type: "query", key: "banka" }] },
    { source: "/haberler", has: [{ type: "query", key: "tur" }] },
    { source: "/en/haberler", has: [{ type: "query", key: "tur" }] },
    { source: "/faiz-olasiligi", has: [{ type: "query", key: "donem" }] },
    { source: "/en/faiz-olasiligi", has: [{ type: "query", key: "donem" }] },
  ],
};
