/**
 * Veri çekme adımlarının hatasını geçici (ağ) ve kalıcı (kaynak değişti)
 * diye ayırır. Geçici hata sarı uyarıdır: veri korunur, ertesi gün düzelir.
 * Kalıcı hata ("kalıp tutmadı", "0 kayıt", HTTP 4xx) kırmızıdır — gerçek
 * kırılma, her gün kırmızı biten bir işin gürültüsünde kaybolmasın.
 *
 * Betikler hata satırını tek biçimde yazar: `✗  <kaynak>: <ileti>`.
 */

const TRANSIENT = [
  /HTTP (5\d\d|429|408)\b/,
  /\b(ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|UND_ERR\w*)\b/,
  /fetch failed/i,
  /\btime(d)? ?out\b/i,
  /\baborted\b/i,
];

export function isTransientMessage(message: string): boolean {
  return TRANSIENT.some((re) => re.test(message));
}

export interface StepFailures {
  transient: string[];
  permanent: string[];
}

/** Adımın çıktısındaki `✗` satırlarını sınıflar. */
export function classifyFailures(output: string): StepFailures {
  const out: StepFailures = { transient: [], permanent: [] };
  for (const line of output.split("\n")) {
    const m = /^✗\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    (isTransientMessage(m[1]) ? out.transient : out.permanent).push(m[1]);
  }
  return out;
}

/**
 * Hata koduyla biten bir adım yalnızca geçici sayılır: en az bir `✗` satırı
 * var ve hepsi geçici. `✗` satırı yoksa (beklenmedik çökme) kalıcıdır.
 */
export function isOnlyTransient(f: StepFailures): boolean {
  return f.transient.length > 0 && f.permanent.length === 0;
}
