/**
 * Erişilebilirlik denetimi: çalışan siteyi gerçek tarayıcıda açar, axe-core
 * ile 390 px (telefon) ve 1280 px'te tarar; "ciddi" ve "kritik" ihlal varsa
 * hata koduyla biter. Yeni bir sayfa iyi durumu sessizce bozmasın diye CI'da
 * koşar (.github/workflows/ci.yml).
 *
 *   npm run build && npm start &   # ardından
 *   npm run a11y                   # varsayılan http://localhost:3000
 *   A11Y_BASE_URL=http://localhost:3918 npm run a11y
 *
 * Tarayıcı bir kez kurulur: npx playwright install chromium
 */
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const BASE = (process.env.A11Y_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const VIEWPORTS = [
  { name: "390px", width: 390, height: 844 },
  { name: "1280px", width: 1280, height: 800 },
];
const BLOCKING = new Set(["serious", "critical"]);

/** İlk karar sayfasının adresi: kararlar listesindeki ilk /karar/ bağlantısı. */
async function firstDecisionPath(): Promise<string> {
  const html = await (await fetch(`${BASE}/kararlar`)).text();
  const m = /href="(\/karar\/[a-z0-9-]+)"/.exec(html);
  if (!m) throw new Error("/kararlar sayfasında karar bağlantısı bulunamadı");
  return m[1];
}

async function main() {
  const paths = ["/", "/takvim", "/faiz-olasiligi", await firstDecisionPath()];
  const browser = await chromium.launch();
  let blocking = 0;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    for (const path of paths) {
      const page = await context.newPage();
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const bad = violations.filter((v) => BLOCKING.has(v.impact ?? ""));
      console.log(`${bad.length === 0 ? "✓" : "✗"}  ${vp.name.padEnd(7)} ${path}  (${violations.length} ihlal, ${bad.length} ciddi/kritik)`);
      for (const v of bad) {
        blocking++;
        console.log(`     [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} öğe)`);
        for (const n of v.nodes.slice(0, 3)) console.log(`       ${n.target.join(" ")}`);
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();

  if (blocking > 0) {
    console.error(`\n${blocking} ciddi/kritik erişilebilirlik ihlali.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
