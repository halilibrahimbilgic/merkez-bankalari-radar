-- İki dilli site: İngilizce özet/gerekçe ve Türkçe başlık/tanıtım cümlesi.
-- Skordan bağımsızdır (sonradan toplu çeviriyle doldurulabilir), bu yüzden
-- score_metadata_complete kısıtına girmez; boşsa arayüz diğer dile düşer.
alter table speeches add column if not exists title_tr text;
alter table speeches add column if not exists context_tr text;
alter table speeches add column if not exists summary_en text;
alter table speeches add column if not exists score_rationale_en text;
