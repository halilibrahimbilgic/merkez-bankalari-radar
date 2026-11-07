import { apiJson, apiDecisions } from "@/lib/api-v1";

export const revalidate = 3600;

export async function GET() {
  const r = await apiDecisions();
  return apiJson(r.data, r.meta);
}
