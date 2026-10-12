/**
 * Kanonik site adresi. Vercel'de otomatik atanan alan adını kullanır;
 * kendi alan adınızı bağladığınızda NEXT_PUBLIC_SITE_URL ile geçersiz kılın.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

/**
 * Sitenin işleteni ve iletişim adresi — gizlilik (KVKK veri sorumlusu) ve
 * iletişim sayfalarında tek kaynaktan gösterilir. Adres, alan adındaki bir
 * yönlendirmedir (MX), kişisel posta kutusu herkese açık değildir.
 */
export const OPERATOR_NAME = "Halil İbrahim Bilgiç";
export const CONTACT_EMAIL = "iletisim@faizradar.com";
export const REPO_URL = "https://github.com/halilibrahimbilgic/merkez-bankalari-radar";
