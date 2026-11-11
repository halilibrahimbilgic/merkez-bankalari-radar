/**
 * Bir npm betiğini çalıştırır ve hatasını sınıflar (bkz. src/lib/transient-error.ts):
 * yalnızca geçici ağ hatası varsa `::warning::` ile yeşil/sarı biter, gerçek
 * kırılmada özgün hata koduyla ve `::error::` ile kırmızı.
 *
 *   npm run ci:step -- fetch:inflation
 */
import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { classifyFailures, isOnlyTransient } from "../src/lib/transient-error";

async function main() {
  const script = process.argv[2];
  if (!script) {
    console.error("Kullanım: npm run ci:step -- <npm betiği> [argümanlar]");
    process.exit(2);
  }
  const args = process.argv.slice(3);

  let output = "";
  const code = await new Promise<number>((resolve) => {
    const child = spawn("npm", ["run", script, ...(args.length ? ["--", ...args] : [])], {
      stdio: ["inherit", "inherit", "pipe"],
    });
    child.stderr.on("data", (d: Buffer) => {
      output += d.toString();
      process.stderr.write(d);
    });
    child.on("close", (c) => resolve(c ?? 1));
  });
  if (code === 0) return;

  const failures = classifyFailures(output);
  if (isOnlyTransient(failures)) {
    for (const f of failures.transient) console.log(`::warning title=${script} geçici hata::${f}`);
    await summary(`⚠️ \`${script}\`: geçici ağ hatası, önceki veri korundu\n${failures.transient.map((f) => `- ${f}`).join("\n")}`);
    return;
  }
  for (const f of failures.permanent) console.log(`::error title=${script} kalıcı hata::${f}`);
  await summary(`❌ \`${script}\` başarısız (kalıcı hata ya da beklenmedik çökme)`);
  process.exit(code);
}

async function summary(text: string) {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text + "\n\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
