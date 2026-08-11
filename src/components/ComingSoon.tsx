import Link from "next/link";

/** Yol haritasında olup henüz yayında olmayan modüller için ortak yer tutucu. */
export function ComingSoon({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <span className="mt-2 inline-block rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">
          {phase} · yapım aşamasında
        </span>
      </header>
      <div className="max-w-2xl space-y-3 text-muted">{children}</div>
      <Link href="/takvim" className="inline-block text-sm text-accent hover:underline">
        Şimdilik toplantı takvimine göz at →
      </Link>
    </div>
  );
}
