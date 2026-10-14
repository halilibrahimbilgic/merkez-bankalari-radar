/**
 * Şahin/güvercin ölçeği — konuşma (score.ts) ve karar metni (statements.ts)
 * istemlerinde ortak: iki puan aynı ölçekte okunsun. Ayrı modülde, çünkü
 * score.ts API istemcisini içe aktarıyor ve sayfalar statements.ts'i kullanıyor.
 */
export const SCORE_SCALE = `ÖLÇEK (-10 ile +10 arası):
  +7..+10  Çok şahin: açık sıkılaşma sinyali, faiz artırımı ima ediliyor
  +3..+6   Şahin: enflasyon endişesi baskın, gevşemeye direnç
  +1..+2   Hafif şahin
   0       Nötr / dengeli: iki yönlü risklere eşit vurgu, veri bağımlılığı
  -1..-2   Hafif güvercin
  -3..-6   Güvercin: büyüme/istihdam endişesi baskın, gevşemeye açık
  -7..-10  Çok güvercin: açık gevşeme sinyali, faiz indirimi ima ediliyor`;
