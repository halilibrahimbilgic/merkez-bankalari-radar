import { apiJson, apiMeetings } from "@/lib/api-v1";

export const revalidate = 3600;

export async function GET() {
  const r = await apiMeetings();
  return apiJson(r.data, r.meta);
}
