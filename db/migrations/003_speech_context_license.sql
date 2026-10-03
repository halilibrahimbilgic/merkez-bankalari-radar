-- Konuşmacının kurumu (BIS tanıtım cümlesi) ve tam metnin sitede
-- yayımlanabilirlik lisansı. Lisans yalnızca yayımcının şartları izin
-- veriyorsa doludur (src/lib/text-license.ts); metnin kendisi veritabanında
-- değil depodaki data/speech-text/<id>.txt'dedir — iki modda da aynı kaynak.
alter table speeches add column if not exists context_en text;
alter table speeches add column if not exists text_license text
  check (text_license in ('frb-public-domain', 'ecb', 'boj', 'cc-by-4.0'));
