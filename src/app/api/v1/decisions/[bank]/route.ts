import { apiError, apiJson, apiDecisions, bankParam, BANK_CODES } from "@/lib/api-v1";

export const revalidate = 3600;

export function generateStaticParams() {
  return BANK_CODES.map((bank) => ({ bank }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ bank: string }> }) {
  const bank = bankParam((await params).bank);
  if (!bank) return apiError(404, `Bilinmeyen banka. Geçerli: ${BANK_CODES.join(", ")}`);
  const r = await apiDecisions(bank);
  return apiJson(r.data, r.meta);
}
