-- Merkez Bankaları Radar — şema (MVP)
-- PostgreSQL 14+ (Supabase / Neon ücretsiz katman)

create table if not exists central_banks (
  id          serial primary key,
  code        text not null unique,          -- 'fed', 'ecb', 'tcmb', ...
  name_tr     text not null,
  name_en     text not null,
  country_tr  text not null,
  timezone    text not null,                 -- IANA, örn. 'America/New_York'
  rate_name_tr text not null,                -- 'Politika faizi', 'Fed Funds hedef aralığı'
  website_url text,
  sort_order  int  not null default 100
);

create table if not exists meetings (
  id             serial primary key,
  bank_id        int  not null references central_banks(id) on delete cascade,
  -- Toplantı/karar anı UTC olarak saklanır; sunumda Europe/Istanbul'a çevrilir.
  meeting_at     timestamptz not null,
  -- Karar saati henüz açıklanmadıysa true; arayüzde sadece tarih gösterilir.
  time_tbd       boolean not null default false,
  type           text not null default 'rate_decision',  -- rate_decision | minutes | projections
  status         text not null default 'scheduled',      -- scheduled | done | cancelled
  decision_rate  numeric(6,3),               -- karar sonrası politika faizi (%)
  previous_rate  numeric(6,3),
  decision_note_tr text,
  source_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (bank_id, meeting_at, type)
);

create index if not exists meetings_at_idx on meetings (meeting_at);
create index if not exists meetings_bank_at_idx on meetings (bank_id, meeting_at desc);

create table if not exists speeches (
  id                 serial primary key,
  bank_id            int  not null references central_banks(id) on delete cascade,
  speaker_name       text not null,
  speaker_role_tr    text,
  title              text not null,
  speech_date        date not null,
  source_url         text not null unique,
  raw_text           text,
  summary_tr         text,
  -- -10 (çok güvercin) .. +10 (çok şahin)
  hawk_dove_score    numeric(4,1),
  score_rationale_tr text,
  scored_at          timestamptz,
  model              text,                   -- skorlamayı yapan model kimliği
  created_at         timestamptz not null default now(),
  constraint speeches_score_range check (
    hawk_dove_score is null or (hawk_dove_score >= -10 and hawk_dove_score <= 10)
  )
);

create index if not exists speeches_date_idx on speeches (speech_date desc);
create index if not exists speeches_bank_date_idx on speeches (bank_id, speech_date desc);

create table if not exists rate_probabilities (
  id             serial primary key,
  bank_id        int not null references central_banks(id) on delete cascade,
  meeting_id     int references meetings(id) on delete cascade,
  -- Baz puan cinsinden senaryo: -50, -25, 0, +25 ...
  scenario_bps   int not null,
  probability_pct numeric(5,2) not null check (probability_pct >= 0 and probability_pct <= 100),
  calculated_at  timestamptz not null default now(),
  source_note_tr text,
  unique (meeting_id, scenario_bps, calculated_at)
);

create index if not exists rate_prob_meeting_idx on rate_probabilities (meeting_id, calculated_at desc);

-- Zamanlanmış işlerin son çalışma durumu (şeffaflık sayfası için)
create table if not exists sync_runs (
  id          serial primary key,
  job         text not null,               -- 'meetings' | 'speeches' | 'probabilities'
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running',  -- running | ok | error
  detail      text
);
