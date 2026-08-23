import Link from "next/link";
import { ALL_BANKS } from "@/lib/banks";
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
}: {
  basePath: string;
  active?: BankCode;
  availableCodes: BankCode[];
}) {
  const available = new Set(availableCodes);

  return (
    <nav aria-label="Banka filtresi" className="flex flex-wrap gap-2">
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
        Tümü
      </Link>

      {ALL_BANKS.map((bank) => {
        const isActive = bank.code === active;

        if (!available.has(bank.code)) {
          return (
            <span
              key={bank.code}
              title={`${bank.nameTr} verisi henüz eklenmedi`}
              className="inline-flex min-h-9 cursor-default items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-sm text-muted opacity-60"
            >
              {bank.nameTr}
              <span className="text-xs">· yakında</span>
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
            {bank.nameTr}
          </Link>
        );
      })}
    </nav>
  );
}
