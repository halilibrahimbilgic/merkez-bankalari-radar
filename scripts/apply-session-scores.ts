/**
 * API kredisi yokken Claude Code oturumunda üretilen skorları arşive yazar.
 *
 * Bu tek seferlik bir dolgu işidir; asıl yol `npm run score:speeches`'tir.
 * Buradaki kayıtlar `scoredVia: "session"` ile işaretlenir, böylece API ile
 * üretilenlerden ayırt edilebilir ve gerekirse yeniden skorlanabilir.
 *
 * Skorlar src/lib/score.ts içindeki aynı ölçek ve kurallara göre verilmiştir.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROMPT_VERSION, SCORING_MODEL } from "../src/lib/score";
import type { Speech } from "../src/lib/types";

const SEED = path.join(process.cwd(), "data", "seed", "speeches.json");

interface Entry {
  summaryTr: string;
  hawkDoveScore: number;
  scoreRationaleTr: string;
  hasPolicySignal: boolean;
  textIsExcerpt?: boolean;
}

const SCORES: Record<string, Entry> = {
  r260730l: {
    hasPolicySignal: true,
    hawkDoveScore: 6,
    summaryTr:
      "Waller, ekonominin reel tarafını sağlam bulduğunu, istihdamın FOMC'nin azami istihdam hedefine yakın seyrettiğini söylüyor; asıl endişesi enflasyon. Çekirdek PCE enflasyonunun Aralık 2025'teki %3'ten Mayıs'ta %3,4'e çıkmasını tarifelerin ya da petrol şokunun tek seferlik etkisiyle açıklanamayacak kadar yaygın buluyor ve fiyat artışlarının hizmetlere de yayıldığını vurguluyor. 2021'de geç kalma hatasını tekrarlamamaya kararlı olduğunu, ancak bugünkü işgücü piyasasının 2022'deki kadar sıkı olmaması ve enflasyon beklentilerinin çıpalı kalması nedeniyle daha temkinli hareket edilebileceğini belirtiyor. Temel senaryosu faizi mevcut seviyede tutmak; fakat çekirdek enflasyonda bir sıcak veri daha gelirse FOMC'nin yakın vadede sıkılaşmayı değerlendirmesi gerekeceğini açıkça söylüyor.",
    scoreRationaleTr:
      "\"Çekirdek enflasyonda bir sıcak okuma daha gelirse FOMC yakın vadede sıkılaşmayı değerlendirmek zorunda kalacak\" ve \"ciddi hiçbir politika kuralı bu koşullarda faiz artırmamayı söylemez\" ifadeleri açık bir sıkılaşma sinyali; temel senaryosunun yine de beklemek olması puanı uç seviyeden uzak tutuyor.",
  },
  r260730r: {
    hasPolicySignal: true,
    hawkDoveScore: 5,
    summaryTr:
      "Cook, çift mandanın iki tarafını da izlediğini ama bu aşamada yüksek enflasyon risklerinin kendisini daha çok kaygılandırdığını söylüyor. İşsizliğin %4,2 ile doğal orana yakın, işgücü piyasasının istikrarlı ve büyümenin beklentilerin üzerinde olmasını istihdam tarafındaki risklerin azaldığına yoruyor; buna karşılık hedeflenen enflasyonun Haziran'da yıllık %3,7'ye çıkmasını ve çekirdek mal fiyatlarının yıllık %5 hızla artmasını enflasyon riskinin ağırlaştığının kanıtı sayıyor. Risk dengesini bir tahterevalliye benzeterek terazinin artık enflasyon tarafına yattığını anlatıyor. Haziran toplantısında faizi sabit tutma yönünde oy verdiğini, ancak yakın zamanda dezenflasyon işareti görmezse harekete geçmeye hazır olduğunu belirtiyor.",
    scoreRationaleTr:
      "\"Risk dengesi enflasyon tarafına kaydı\" tespiti ve \"yakında dezenflasyon işareti görmezsem harekete geçmeye hazırım\" ifadesi belirgin şahin duruş; mevcut kararı bekleme yönünde olduğu için en üst basamağa çıkarılmadı.",
  },
  r260731b: {
    hasPolicySignal: true,
    hawkDoveScore: 3,
    summaryTr:
      "Jefferson'ın konuşmasının büyük bölümü, politika yapıcıların arz ve talep şoklarını gerçek zamanlı olarak nasıl sınıflandırıp yanıtladığına dair kavramsal bir çerçeve sunuyor. Güncel dönemde iki gelişmeyi izlediğini söylüyor: Orta Doğu kaynaklı enerji şoku ve yapay zekânın makroekonomik etkileri. Enerji şokunun, enflasyonun zaten bir süredir hedefin üzerinde olduğu bir ortamda gelmesinin FOMC'yi mandanın iki tarafı arasında hassas bir dengeye zorladığını, arka arkaya gelen şokların enflasyonun kalıcılaşması riskini artırdığını belirtiyor. Haziran'da faizin %3,50-3,75 aralığında tutulmasını desteklediğini ve mevcut duruşun enflasyonun düşüşünü sürdürmesine izin vereceğini düşünüyor.",
    scoreRationaleTr:
      "Mevcut duruşu yeterli görüp beklemeyi savunuyor, ancak \"enflasyon yakında soğumaya başlamazsa mevcut politika duruşunu yeniden değerlendirmek uygun olabilir\" ifadesiyle sıkılaşma yönünde bir eğilim gösteriyor.",
  },
  r260731a: {
    hasPolicySignal: true,
    hawkDoveScore: 2,
    summaryTr:
      "Williams, ABD ekonomisini Orta Doğu çatışmasına rağmen dirençli buluyor; büyüme %2 civarında, işsizlik %4,25-4,50 bandında istikrarlı. Enflasyonun %4 ile tartışmasız çok yüksek olduğunu söylüyor ve bunu üç etkene bağlıyor: tarifeler, enerji/tedarik zinciri şoku ve yapay zekâ yatırımının belirli mal gruplarında yarattığı talep baskısı. Buna karşılık enflasyonun zirveyi gördüğüne ve önümüzdeki çeyreklerde gerileyeceğine dair altı gerekçe sıralıyor — tarife etkilerinin büyük ölçüde tamamlanması, kira enflasyonundaki düşüş eğilimi, petrol fiyatlarındaki geri çekilme ve çıpalı enflasyon beklentileri bunlar arasında. Enflasyonun yıl sonunda %3,25'e ineceğini, 2028'de hedefe ulaşacağını öngörüyor ve mevcut faiz duruşunu bunun için \"iyi konumlanmış\" buluyor.",
    scoreRationaleTr:
      "Enflasyonu \"tartışmasız çok yüksek\" bulması hafif şahin bir ton veriyor; ancak zirvenin geride kaldığını düşünmesi, kademeli düşüş öngörmesi ve sıkılaşmadan hiç söz etmemesi puanı nötre yakın tutuyor.",
  },
  r260730e: {
    hasPolicySignal: false,
    hawkDoveScore: 0,
    summaryTr:
      "Waller bu konuşmada güncel faiz duruşuna girmeden para politikasının aktarım mekanizmasına dair iki metodolojik nokta tartışıyor. Birincisi, başlangıç koşullarının belirleyici olduğu: 2022'de açık iş sayısının işsiz başına 2 olması, sıkılaşmanın işsizliği sert biçimde artırmak yerine ağırlıkla açık işleri azaltarak etki etmesini sağlamıştı; geçmiş ortalamalara dayanan doğrusal modeller bunu öngöremezdi. İkincisi, ileriye dönük yönlendirmenin (forward guidance) iki yüzü olduğu: doğru kullanıldığında aktarımı hızlandırdığını, fakat 2020-21'deki gibi katı olduğunda FOMC'nin elini bağlayıp faiz artışlarını gereksiz yere geciktirebildiğini anlatıyor.",
    scoreRationaleTr:
      "Konuşma tamamen aktarım mekanizması ve iletişim politikası üzerine metodolojik bir tartışma; güncel faiz duruşuna dair ileriye dönük bir sinyal içermediği için nötr puanlandı.",
  },
  r260730s: {
    hasPolicySignal: true,
    hawkDoveScore: -1,
    summaryTr:
      "Bailey'in konuşmasının ağırlığı büyüme ve düzenleme üzerine, ancak açılışında para politikasına kısa bir yer veriyor: Orta Doğu çatışması öncesinde enflasyonun Nisan-Mayıs gibi %2 hedefine döneceğini beklediğini, şok olmasaydı bunun gerçekleşeceğine dair kanıtların son aylarda güçlendiğini söylüyor. Enflasyonun hedefe döneceğinden emin olduğunu, koşulların cesaret verici olduğunu, ancak bunun daha uzun süreceğini belirtiyor ve ekonomik aktivitenin \"oldukça yumuşak\" olduğunu ekliyor. Konuşmanın geri kalanı, İngiltere'nin on beş yıldır düşük seyreden potansiyel büyümesini, iyi tasarlanmış düzenlemenin büyümeyi nasıl destekleyebileceğini ve yapay zekânın hem sorumluluk hukuku hem siber güvenlik açısından doğurduğu soruları ele alıyor.",
    scoreRationaleTr:
      "Enerji kaynaklı enflasyon sapmasını geçici sayıp hedefe dönüşe güven belirtmesi ve aktivitenin yumuşaklığına dikkat çekmesi hafif güvercin bir ton; para politikası içeriğinin sınırlı olması nedeniyle puan sıfıra yakın tutuldu.",
  },
  r260730j: {
    hasPolicySignal: false,
    hawkDoveScore: 0,
    summaryTr:
      "Bowman, FSB'nin denetim ve düzenleme modernizasyonu çalışmasını ve bunun ABD'deki uygulamasını anlatıyor. Dört ilke sıralıyor: maddi finansal risklere öncelik vermek, düzenlemeyi kurumun risk profiline göre ölçeklemek, şeffaflık ve hesap verebilirliği öne almak, ve çerçeveyi sorumlu yeniliğe açık tutmak. Silicon Valley Bank örneğinden hareketle çok sayıda denetim bulgusunun etkili denetim anlamına gelmediğini savunuyor. ABD'de 2026 Basel III sermaye çerçevesi reformu, denetim ilkelerinin ilk kez yayımlanması ve eskimiş varlık eşiklerinin güncellenmesi gibi adımları örnek gösteriyor.",
    scoreRationaleTr:
      "Konuşma tamamen finansal düzenleme ve denetim üzerine; faiz veya enflasyon görünümüne dair hiçbir ifade içermediği için para politikası sinyali taşımıyor.",
  },
  r260805c: {
    hasPolicySignal: false,
    hawkDoveScore: 0,
    summaryTr:
      "Bowman, FSB'nin yapay zekânın finans kurumlarında sorumlu kullanımına dair istişare raporunu tanıtıyor. Raporun, kurumların yapay zekâyı hangi kullanım senaryosunda ve ne ölçüde kritik biçimde kullandığına göre denetim yoğunluğunun belirlenmesi gerektiğini vurguladığını söylüyor. Düşük riskli kullanımların daha hafif bir denetim dokunuşuyla ele alınması ve büyük kurumlar için tasarlanan gerekliliklerin küçük kurumlara aynen uygulanmaması gerektiğini savunuyor. Raporun yıl sonunda ABD'nin G-20 dönem başkanlığına sunulacağını belirtiyor.",
    scoreRationaleTr:
      "Konuşma yapay zekâ denetimi ve düzenleyici çerçeve üzerine; para politikası duruşuna dair sinyal içermiyor.",
  },
  r260730o: {
    hasPolicySignal: false,
    hawkDoveScore: 0,
    summaryTr:
      "Bowman, finansal kapsayıcılık konferansındaki bu konuşmasında bankaların sorumlu yenilik yoluyla erişimi genişletebileceğini anlatıyor. Fed'in rolünün açık beklentiler koymak ve şeffaf olmak olduğunu, bankaların iş kararlarını mikro yönetmemek gerektiğini vurguluyor. Yapay zekânın, kredi geçmişi zayıf ama nakit akışı yeterli tüketicilere kredi erişimini genişletme potansiyeli taşıdığını, ancak kredi kararlarını doğrudan etkileyen kullanımların daha ağır hukuki uyum sorunları doğurduğunu belirtiyor. Küçük bankaların büyükleriyle aynı kaynaklara sahip olmadığını, denetim rehberliğinin yeniliğe engel olmaması gerektiğini söylüyor.",
    scoreRationaleTr:
      "Konuşma finansal kapsayıcılık ve banka düzenlemesi üzerine; faiz veya enflasyon görünümüne değinmiyor.",
  },
  r260730n: {
    hasPolicySignal: false,
    hawkDoveScore: 0,
    textIsExcerpt: true,
    summaryTr:
      "Barr, yapay zekânın yaşam standartlarını geniş kesimler için yükseltip yükseltmeyeceğini yoksa gelir ve servet eşitsizliğini derinleştirip derinleştirmeyeceğini tartışıyor. Her büyük teknolojik sıçramanın işgücü piyasasında derin etkiler yarattığını, uzun vadede yıktığından çok iş yarattığını, ancak geçiş döneminde yerinden edilen insan sayısının ve uğradıkları zararın büyük ve kalıcı olabileceğini hatırlatıyor. İnternetin yaygınlaşmasını örnek göstererek üretkenliği artırırken bilgi yoğun mesleklere orantısız fayda sağladığı için eşitsizliği de büyütmüş olabileceğini söylüyor. (BIS bu konuşmanın yalnızca giriş bölümünü yayımlıyor; tam metin PDF'tedir.)",
    scoreRationaleTr:
      "Konuşma yapay zekânın işgücü ve eşitsizlik üzerindeki etkilerine odaklanıyor; para politikası duruşuna dair sinyal içermiyor.",
  },
  r260730g: {
    hasPolicySignal: false,
    hawkDoveScore: 0,
    textIsExcerpt: true,
    summaryTr:
      "Hunter, RBA'nın ortalama olarak orta vadede %2-3 enflasyon bandı ve sürdürülebilir tam istihdam mandasını hatırlatarak arz şoklarının para politikası açısından nasıl okunması gerektiğini anlatmaya başlıyor. Ekonominin üretim kapasitesini, toplam talebi ve maliyetleri etkileyen çok sayıda gücün bir arada değerlendirilmesi gerektiğini söylüyor. Mandanın iki tarafını tek bir şemada birleştiren basitleştirilmiş bir çerçeve sunuyor: dikey eksende enflasyon, yatay eksende işgücü piyasasının atıl kapasite ile aşırı sıkılık arasındaki konumu. (BIS bu konuşmanın yalnızca giriş bölümünü yayımlıyor; tam metin PDF'tedir.)",
    scoreRationaleTr:
      "Erişilebilen metin, arz şoklarını değerlendirmeye yönelik kavramsal çerçevenin tanıtımıyla sınırlı; güncel faiz duruşuna dair bir ifade içermiyor.",
  },
};

async function main() {
  const store = JSON.parse(await readFile(SEED, "utf8")) as {
    fetchedAt: string;
    speeches: Speech[];
  };

  let applied = 0;
  const now = new Date().toISOString();

  for (const speech of store.speeches) {
    const entry = SCORES[speech.id];
    if (!entry) continue;

    speech.summaryTr = entry.summaryTr;
    speech.hawkDoveScore = entry.hawkDoveScore;
    speech.scoreRationaleTr = entry.scoreRationaleTr;
    speech.hasPolicySignal = entry.hasPolicySignal;
    speech.model = SCORING_MODEL;
    speech.promptVersion = PROMPT_VERSION;
    speech.scoredAt = now;
    speech.scoredVia = "session";
    if (entry.textIsExcerpt) speech.textIsExcerpt = true;
    applied++;
  }

  await writeFile(SEED, JSON.stringify(store, null, 2) + "\n", "utf8");

  const missing = Object.keys(SCORES).filter(
    (id) => !store.speeches.some((s) => s.id === id),
  );
  console.log(`→ ${applied} konuşmaya skor yazıldı.`);
  if (missing.length) console.warn(`⚠  arşivde bulunamayan: ${missing.join(", ")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
