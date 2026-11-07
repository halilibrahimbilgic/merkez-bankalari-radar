import { apiError, apiJson, apiTrInflation } from "@/lib/api-v1";

export const revalidate = 3600;

export async function GET() {
  const r = await apiTrInflation();
  if (!r) return apiError(503, "Enflasyon verisi henüz yok.");
  return apiJson(r.data, r.meta);
}
