import { API_VERSION, apiJson, BANK_CODES } from "@/lib/api-v1";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

/** Uçların listesi — belgeleme /gelistiriciler sayfasında. */
export function GET() {
  const base = `${SITE_URL}/api/${API_VERSION}`;
  return apiJson({
    endpoints: {
      meetings: `${base}/meetings`,
      meetingsByBank: `${base}/meetings/{bank}`,
      decisions: `${base}/decisions`,
      decisionsByBank: `${base}/decisions/{bank}`,
      turkeyInflation: `${base}/inflation/tr`,
    },
    banks: BANK_CODES,
  });
}
