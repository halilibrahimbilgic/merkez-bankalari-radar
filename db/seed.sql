-- Banka meta verisi. Kodda src/lib/banks.ts ile aynı tutulmalıdır.
insert into central_banks (code, name_tr, name_en, country_tr, timezone, rate_name_tr, website_url, sort_order)
values
  ('fed',  'Fed',  'Federal Reserve', 'ABD', 'America/New_York',
   'Fed Funds hedef aralığı',
   'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 10),
  ('ecb',  'ECB',  'European Central Bank', 'Euro Bölgesi', 'Europe/Berlin',
   'Mevduat kolaylığı faizi',
   'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html', 20),
  ('tcmb', 'TCMB', 'Central Bank of the Republic of Türkiye', 'Türkiye', 'Europe/Istanbul',
   '1 hafta vadeli repo (politika) faizi',
   'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim', 30),
  ('boe',  'BoE',  'Bank of England', 'Birleşik Krallık', 'Europe/London',
   'Banka faizi (Bank Rate)',
   'https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates', 40),
  ('boj',  'BoJ',  'Bank of Japan', 'Japonya', 'Asia/Tokyo',
   'Kısa vadeli politika faizi',
   'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm', 50),
  ('rba',  'RBA',  'Reserve Bank of Australia', 'Avustralya', 'Australia/Sydney',
   'Nakit faiz oranı (Cash Rate)',
   'https://www.rba.gov.au/schedules-events/', 60)
on conflict (code) do update set
  name_tr = excluded.name_tr,
  name_en = excluded.name_en,
  country_tr = excluded.country_tr,
  timezone = excluded.timezone,
  rate_name_tr = excluded.rate_name_tr,
  website_url = excluded.website_url,
  sort_order = excluded.sort_order;
