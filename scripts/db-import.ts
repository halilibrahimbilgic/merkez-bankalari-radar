/**
 * data/seed/*.json içeriğini veritabanına aktarır.
 *
 *   DATABASE_URL=postgres://... npm run db:import
 *
 * Idempotent: kimlikler içerikten türediği için (bkz. src/lib/data/ids.ts)
 * her kayıt upsert edilir, tekrar çalıştırmak kopya üretmez.
 *
 * Skorlama alanlarına dikkat: seed'de skorsuz olan bir konuşma, veritabanında
 * zaten skorluysa skor ÜZERİNE YAZILMAZ. Skorlama elle yürütülen bir süreç
 * (bkz. /hakkinda) ve günlük veri çekme işi skorsuz kayıtlar üretir; naif bir
 * upsert her gece mevcut skorları silerdi.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import type { Meeting, Speech } from "../src/lib/types";
import type { CurrentRate } from "../src/lib/data/rates";
import type { ProbabilitySnapshot } from "../src/lib/sources/mpt";

const SEED = path.join(process.cwd(), "data", "seed");

async function readSeed<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(SEED, file), "utf8")) as T;
  } catch {
    console.log(`· ${file} yok, atlandı`);
    return null;
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL tanımlı değil.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  try {
    await importMeetings(pool);
    await importSpeeches(pool);
    await importRates(pool);
    await importProbabilities(pool);
  } finally {
    await pool.end();
  }
}

async function importMeetings(pool: Pool) {
  const seed = await readSeed<{ meetings: Meeting[] }>("meetings.json");
  if (!seed) return;

  for (const m of seed.meetings) {
    await pool.query(
      `insert into meetings (
         id, bank_code, meeting_at, time_tbd, type, status,
         decision_rate, decision_rate_lower, previous_rate,
         decision_note_tr, source_url, updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       on conflict (id) do update set
         meeting_at          = excluded.meeting_at,
         time_tbd            = excluded.time_tbd,
         type                = excluded.type,
         status              = excluded.status,
         -- Karar oranı yalnızca yeni veri geldiyse güncellenir: geçmiş bir
         -- toplantının açıklanmış oranı, kaynak onu düşürdüğünde silinmesin.
         decision_rate       = coalesce(excluded.decision_rate, meetings.decision_rate),
         decision_rate_lower = coalesce(excluded.decision_rate_lower, meetings.decision_rate_lower),
         previous_rate       = coalesce(excluded.previous_rate, meetings.previous_rate),
         decision_note_tr    = coalesce(excluded.decision_note_tr, meetings.decision_note_tr),
         source_url          = coalesce(excluded.source_url, meetings.source_url),
         updated_at          = now()`,
      [
        m.id,
        m.bankCode,
        m.meetingAt,
        m.timeTbd,
        m.type,
        m.status,
        m.decisionRate ?? null,
        m.decisionRateLower ?? null,
        m.previousRate ?? null,
        m.decisionNoteTr ?? null,
        m.sourceUrl ?? null,
      ],
    );
  }
  console.log(`✓ ${seed.meetings.length} toplantı`);
}

async function importSpeeches(pool: Pool) {
  const seed = await readSeed<{ speeches: Speech[] }>("speeches.json");
  if (!seed) return;

  for (const s of seed.speeches) {
    await pool.query(
      `insert into speeches (
         id, bank_code, speaker_name, speaker_role_tr, title, speech_date,
         source_url, raw_text, text_is_excerpt, summary_tr, hawk_dove_score,
         has_policy_signal, score_rationale_tr, model, prompt_version,
         scored_at, scored_via, context_en, text_license
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       on conflict (id) do update set
         context_en      = coalesce(excluded.context_en, speeches.context_en),
         text_license    = excluded.text_license,
         speaker_name    = excluded.speaker_name,
         speaker_role_tr = coalesce(excluded.speaker_role_tr, speeches.speaker_role_tr),
         title           = excluded.title,
         speech_date     = excluded.speech_date,
         source_url      = excluded.source_url,
         raw_text        = coalesce(excluded.raw_text, speeches.raw_text),
         text_is_excerpt = excluded.text_is_excerpt,
         -- Skor bloğu ya tümüyle yeni veriden gelir ya tümüyle korunur.
         -- Alanları tek tek coalesce etmek, score_metadata_complete
         -- kısıtını bozan yarım kayıtlar üretebilirdi.
         summary_tr         = case when excluded.hawk_dove_score is not null
                                   then excluded.summary_tr else speeches.summary_tr end,
         hawk_dove_score    = coalesce(excluded.hawk_dove_score, speeches.hawk_dove_score),
         has_policy_signal  = case when excluded.hawk_dove_score is not null
                                   then excluded.has_policy_signal else speeches.has_policy_signal end,
         score_rationale_tr = case when excluded.hawk_dove_score is not null
                                   then excluded.score_rationale_tr else speeches.score_rationale_tr end,
         model              = case when excluded.hawk_dove_score is not null
                                   then excluded.model else speeches.model end,
         prompt_version     = case when excluded.hawk_dove_score is not null
                                   then excluded.prompt_version else speeches.prompt_version end,
         scored_at          = case when excluded.hawk_dove_score is not null
                                   then excluded.scored_at else speeches.scored_at end,
         scored_via         = case when excluded.hawk_dove_score is not null
                                   then excluded.scored_via else speeches.scored_via end`,
      [
        s.id,
        s.bankCode,
        s.speakerName,
        s.speakerRoleTr ?? null,
        s.title,
        s.speechDate,
        s.sourceUrl,
        s.rawText ?? null,
        s.textIsExcerpt ?? false,
        s.summaryTr ?? null,
        s.hawkDoveScore ?? null,
        // Skor varsa sinyal bayrağı da dolu olmalı: eski kayıtlarda bu alan
        // yoktu, skorlanmışları sinyalli sayıyoruz (o dönemde ayrım yoktu).
        s.hawkDoveScore === undefined ? null : (s.hasPolicySignal ?? true),
        s.scoreRationaleTr ?? null,
        s.model ?? null,
        s.promptVersion ?? null,
        s.hawkDoveScore === undefined ? null : (s.scoredAt ?? new Date().toISOString()),
        s.scoredVia ?? null,
        s.contextEn ?? null,
        s.textLicense ?? null,
      ],
    );
  }
  console.log(`✓ ${seed.speeches.length} konuşma`);
}

async function importRates(pool: Pool) {
  const seed = await readSeed<{ rates: CurrentRate[] }>("current-rates.json");
  if (!seed) return;

  for (const r of seed.rates) {
    await pool.query(
      `insert into current_rates (bank_code, rate, rate_lower, as_of, source_url, updated_at)
       values ($1,$2,$3,$4,$5, now())
       on conflict (bank_code) do update set
         rate       = excluded.rate,
         rate_lower = excluded.rate_lower,
         as_of      = excluded.as_of,
         source_url = excluded.source_url,
         updated_at = now()
       -- Daha eski bir gözlem günü güncel satırı geriye almasın.
       where excluded.as_of >= current_rates.as_of`,
      [r.bankCode, r.rate, r.rateLower ?? null, r.asOf, r.sourceUrl],
    );
  }
  console.log(`✓ ${seed.rates.length} güncel faiz`);
}

async function importProbabilities(pool: Pool) {
  const seed = await readSeed<ProbabilitySnapshot>("probabilities.json");
  if (!seed) return;

  await pool.query(
    `insert into probability_snapshots (as_of, target_lower_bps, target_upper_bps, fetched_at)
     values ($1,$2,$3, now())
     on conflict (as_of) do update set
       target_lower_bps = excluded.target_lower_bps,
       target_upper_bps = excluded.target_upper_bps,
       fetched_at       = now()`,
    [seed.asOf, seed.targetRange?.lowerBps ?? null, seed.targetRange?.upperBps ?? null],
  );

  let buckets = 0;
  for (const w of seed.windows) {
    await pool.query(
      `insert into probability_windows (
         as_of, start_date, prob_cut_pct, prob_hike_pct, mean_bps, mode_bps, p25_bps, p75_bps
       ) values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (as_of, start_date) do update set
         prob_cut_pct  = excluded.prob_cut_pct,
         prob_hike_pct = excluded.prob_hike_pct,
         mean_bps      = excluded.mean_bps,
         mode_bps      = excluded.mode_bps,
         p25_bps       = excluded.p25_bps,
         p75_bps       = excluded.p75_bps`,
      [
        seed.asOf,
        w.startDate,
        w.probCutPct ?? null,
        w.probHikePct ?? null,
        w.meanBps ?? null,
        w.modeBps ?? null,
        w.p25Bps ?? null,
        w.p75Bps ?? null,
      ],
    );

    for (const b of w.buckets) {
      await pool.query(
        `insert into probability_buckets (as_of, start_date, lower_bps, upper_bps, probability_pct)
         values ($1,$2,$3,$4,$5)
         on conflict (as_of, start_date, lower_bps) do update set
           upper_bps       = excluded.upper_bps,
           probability_pct = excluded.probability_pct`,
        [seed.asOf, w.startDate, b.lowerBps, b.upperBps, b.probabilityPct],
      );
      buckets++;
    }
  }
  console.log(
    `✓ ${seed.asOf} anlığı: ${seed.windows.length} pencere, ${buckets} bant`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
