-- Merkez Bankaları Radar — ilk şema.
--
-- Tasarım kararları:
--
-- 1) Birincil anahtarlar `text` ve içerikten türetilir ("fed-2026-09-16",
--    bkz. src/lib/data/ids.ts). Surrogate uuid yerine bunu seçtik çünkü
--    aynı kimlik hem seed JSON'unda hem URL'de hem veritabanında geçerli
--    olur; veritabanı açılıp kapandığında /konusma/<id> bağlantıları
--    kırılmaz ve yeniden içe aktarma doğal olarak idempotent olur.
--
-- 2) `central_banks` yalnızca referans çapasıdır — tek kolon, kod. Görünen
--    ad, saat dilimi ve faiz adı gibi sunum verisi src/lib/banks.ts'te
--    kalır: nadiren değişir, her sayfada gerekir ve veritabanı olmadan da
--    arayüzün çalışması gerekir. İki yerde tutmak kaçınılmaz bir kayma
--    (drift) kaynağı olurdu.
--
-- 3) Oranlar `numeric` — float değil. %3,375 gibi değerlerde ikili kayan
--    nokta hatası baz puan aritmetiğini bozar.

create table if not exists schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- bankalar

create table central_banks (
  code text primary key
);

insert into central_banks (code) values
  ('fed'), ('ecb'), ('tcmb'), ('boe'), ('boj'), ('rba');

-- -------------------------------------------------------------- toplantılar

create table meetings (
  id                  text primary key,
  bank_code           text not null references central_banks (code),

  -- Karar anı UTC olarak saklanır. Sunum katmanı TRT'ye çevirir
  -- (src/lib/tz.ts); yaz saati geçişleri orada ele alınır.
  meeting_at          timestamptz not null,
  -- Banka günü ilan etti ama saati açıklamadıysa gün başı + time_tbd.
  time_tbd            boolean     not null default false,

  type                text        not null
                        check (type in ('rate_decision', 'minutes', 'projections')),
  status              text        not null default 'scheduled'
                        check (status in ('scheduled', 'done', 'cancelled')),

  -- Fed bir hedef aralık ilan eder: _lower alt sınır, decision_rate üst
  -- sınırdır. Tek oranlı bankalarda _lower boş kalır.
  decision_rate       numeric(6, 3),
  decision_rate_lower numeric(6, 3),
  previous_rate       numeric(6, 3),

  decision_note_tr    text,
  source_url          text,
  updated_at          timestamptz not null default now(),

  -- Alt sınır varsa üst sınır da olmalı, ve alt <= üst.
  constraint rate_lower_needs_upper
    check (decision_rate_lower is null or decision_rate is not null),
  constraint rate_range_ordered
    check (decision_rate_lower is null or decision_rate_lower <= decision_rate)
);

-- Takvim sorguları hep tarihe göre sıralı ve sık sık bankaya göre filtreli.
create index meetings_meeting_at_idx on meetings (meeting_at);
create index meetings_bank_meeting_at_idx on meetings (bank_code, meeting_at);

-- --------------------------------------------------------------- konuşmalar

create table speeches (
  id                 text primary key,
  bank_code          text not null references central_banks (code),

  speaker_name       text not null,
  speaker_role_tr    text,
  title              text not null,
  speech_date        date not null,
  source_url         text not null,

  -- Skorlamaya girdi olan tam metin. Arayüzde gösterilmez; üçüncü taraf
  -- telif hakkı taşıdığı için ayrı kolonda durur ve sorgularda
  -- seçilmez (bkz. src/lib/data/speeches.ts).
  raw_text           text,
  -- BIS bazı konuşmaların yalnızca girişini HTML'de yayımlar.
  text_is_excerpt    boolean not null default false,

  summary_tr         text,
  hawk_dove_score    smallint check (hawk_dove_score between -10 and 10),
  -- Konuşma para politikası duruşuna dair sinyal taşıyor mu? Düzenleme
  -- konuşmaları 0 alır ama bu "nötr duruş" değil "sinyal yok" demektir;
  -- ortalamalara katılmazlar. null = henüz skorlanmadı.
  has_policy_signal  boolean,
  score_rationale_tr text,

  model              text,
  -- Skorun hangi prompt sürümüyle üretildiği — sürümler arası
  -- karşılaştırmanın geçerli olup olmadığını bilmek için.
  prompt_version     text,
  scored_at          timestamptz,
  scored_via         text check (scored_via in ('api', 'session')),

  created_at         timestamptz not null default now(),

  -- Skor ile skorlama meta verisi birlikte var olur ya da hiç olmaz.
  -- Yarım skorlanmış kayıt, ortalamaları sessizce bozardı.
  constraint score_metadata_complete
    check (
      (hawk_dove_score is null and scored_at is null and has_policy_signal is null)
      or
      (hawk_dove_score is not null and scored_at is not null and has_policy_signal is not null)
    )
);

create index speeches_date_idx on speeches (speech_date desc);
create index speeches_bank_date_idx on speeches (bank_code, speech_date desc);
-- Skorlanmış kayıtların kısmi indeksi: /skor sayfasının ana sorgusu.
create index speeches_scored_idx on speeches (bank_code, speech_date desc)
  where hawk_dove_score is not null;

-- ------------------------------------------------------------ güncel faizler

-- Banka başına tek satır: yürürlükteki politika faizi.
create table current_rates (
  bank_code  text primary key references central_banks (code),
  rate       numeric(6, 3) not null,
  -- Fed'de hedef aralığın alt sınırı; diğerlerinde boş.
  rate_lower numeric(6, 3),
  as_of      date not null,
  source_url text not null,
  updated_at timestamptz not null default now(),

  constraint current_rate_range_ordered
    check (rate_lower is null or rate_lower <= rate)
);

-- --------------------------------------------------- faiz olasılığı anlıkları

-- Atlanta Fed MPT bir gözlem günü (as_of) için birden çok üç aylık
-- referans penceresi, her pencere için de 25 baz puanlık bantlar yayımlar.
-- Üç tabloya ayırmak geçmiş anlıkları biriktirip "piyasa beklentisi zaman
-- içinde nasıl değişti" sorusunu cevaplamayı mümkün kılar; tek JSON
-- kolonunda bu sorgulanamazdı.
create table probability_snapshots (
  as_of             date primary key,
  -- Gözlem günündeki yürürlükteki Fed hedef aralığı, baz puan.
  target_lower_bps  integer,
  target_upper_bps  integer,
  fetched_at        timestamptz not null default now(),

  constraint target_range_ordered
    check (target_lower_bps is null or target_lower_bps <= target_upper_bps)
);

create table probability_windows (
  as_of          date not null references probability_snapshots (as_of) on delete cascade,
  -- Referans penceresinin başlangıcı (IMM tarihi).
  start_date     date not null,

  prob_cut_pct   numeric(5, 2),
  prob_hike_pct  numeric(5, 2),
  mean_bps       numeric(8, 2),
  mode_bps       numeric(8, 2),
  p25_bps        numeric(8, 2),
  p75_bps        numeric(8, 2),

  primary key (as_of, start_date)
);

create table probability_buckets (
  as_of           date not null,
  start_date      date not null,
  lower_bps       integer not null,
  upper_bps       integer not null,
  probability_pct numeric(5, 2) not null,

  primary key (as_of, start_date, lower_bps),
  foreign key (as_of, start_date)
    references probability_windows (as_of, start_date) on delete cascade,

  constraint bucket_range_ordered check (lower_bps < upper_bps)
);
