@AGENTS.md
@ARCHITECTURE.md

# Kodlama ilkeleri

Kaynak: [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills),
bu projeye uyarlandı. Amaç: gereksiz değişikliği ve aşırı mühendisliği önlemek.

**1. Kodlamadan önce düşün.** Varsayımlarını açıkça söyle; emin değilsen sor.
Birden fazla yorum varsa sessizce birini seçme, seçenekleri göster. Daha basit
bir yol varsa söyle, gerekiyorsa itiraz et.

**2. Önce sadelik.** İstenenin ötesinde özellik yok. Tek kullanımlık koda
soyutlama yok, istenmemiş "esneklik" ya da ayar yok, imkânsız senaryolar için
hata yönetimi yok. 200 satır 50 olabiliyorsa yeniden yaz.

**3. Cerrahi değişiklik.** Komşu kodu, yorumları, biçimi "iyileştirme"; bozuk
olmayanı yeniden düzenleme; mevcut üsluba uy. İlgisiz ölü kodu fark edersen
söyle, silme. Yalnızca *senin* değişikliğinin kullanılmaz bıraktığını kaldır.

**4. Doğrulanabilir hedef.** Görevi kontrol edilebilir bir sonuca çevir ve kısa
bir planla her adımın nasıl doğrulanacağını belirt. Bu projede test paketi yok;
doğrulama `npx tsc --noEmit`, `npm run lint`, `npx next build` ve gerekirse
script'in gerçek çıktısıdır (ör. `data/seed/*.json` farkı).
