import { ALL_BANKS } from "@/lib/banks";
import { BankPage, bankMetadata } from "@/views/BankPage";

export const revalidate = 3600;

export function generateStaticParams() {
  return ALL_BANKS.map((b) => ({ code: b.code }));
}

export async function generateMetadata({ params }: PageProps<"/en/banka/[code]">) {
  return bankMetadata("en", (await params).code);
}

export default async function Page({ params }: PageProps<"/en/banka/[code]">) {
  return <BankPage lang="en" code={(await params).code} />;
}
