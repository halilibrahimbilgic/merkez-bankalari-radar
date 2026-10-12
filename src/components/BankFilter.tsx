import Link from "next/link";
import { ALL_BANKS, bankName } from "@/lib/banks";
import { L, type Lang } from "@/lib/i18n";
import type { BankCode } from "@/lib/types";

/**
 * Banka filtresi.
 *
 * Verisi olmayan bankalar gizlenmez, pasif olarak gösterilir: kapsamı
 * saklamak yerine yol haritasını iletir. Tıklanabilir olsalardı kullanıcı
 * çiplerin yarısında boş sonuç ekranına düşerdi.
 */
export function BankFilter({
  basePath,
  active,
  availableCodes,
  lang,
}: {
  /** Dil önekli yol: "/takvim" ya da "/en/takvim". */
  basePath: string;
  active?: BankCode;
  availableCodes: BankCode[];
  lang: Lang;
}) {
  const t = L(lang);
  const available = new Set(availableCodes);

  return (
    <nav aria-label={t("Banka filtresi", "Bank filter")} className="flex flex-wrap gap-2">
      <Link
        href={basePath}
        aria-current={active === undefined ? "page" : undefined}
        className={
          "inline-flex min-h-9 items-center rounded-full border px-3 text-sm " +
          (active === undefined
            ? "border-accent bg-accent-soft text-accent"
            : "border-border text-muted hover:border-accent hover:text-accent")
        }
      >
        {t("Tümü", "All")}
      </Link>

      {ALL_BANKS.map((bank) => {
        const isActive = bank.code === active;

        if (!available.has(bank.code)) {
          return (
            <span
              key={bank.code}
              title={t(
                `${bank.nameTr} verisi henüz eklenmedi`,
                `No ${bank.shortEn} data yet`,
              )}
              className="inline-flex min-h-9 cursor-default items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-sm text-muted opacity-60"
            >
              {bankName(bank, lang)}
              <span className="text-xs">· {t("yakında", "soon")}</span>
            </span>
          );
        }

        return (
          <Link
            key={bank.code}
            href={`${basePath}?banka=${bank.code}`}
            aria-current={isActive ? "page" : undefined}
            className={
              "inline-flex min-h-9 items-center rounded-full border px-3 text-sm " +
              (isActive
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:border-accent hover:text-accent")
            }
          >
            {bankName(bank, lang)}
          </Link>
        );
      })}
    </nav>
  );
}
