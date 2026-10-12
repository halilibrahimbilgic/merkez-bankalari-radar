import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gizlilik",
  description:
    "Hangi verinin işlendiği, neden işlendiği ve haklarınız — kısa ve açık bir KVKK aydınlatma metni.",
};

/**
 * Bu sayfa sitenin gerçekte yaptığını anlatır; yeni bir analiz aracı, form ya
 * da çerez eklenirse burası da güncellenmeli. Vercel Web Analytics iddiaları
 * Vercel'in kendi belgesinden alındı (vercel.com/docs/analytics/privacy-policy,
 * 12 Ekim 2026): çerez yok, istekten üretilen özet 24 saatte silinir, IP ile
 * ilişkilendirilmez.
 */
const UPDATED = "12 Ekim 2026";

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Gizlilik</h1>
        <p className="prose-width mt-2 text-muted">
          Kısaca: hesap, form, çerez ve reklam yok. Yalnızca hangi sayfaların
          ziyaret edildiğini kimliğinizi bilmeden sayıyoruz.
        </p>
      </header>

      <Section title="Veri sorumlusu">
        <p>
          Bu site {OPERATOR_NAME} tarafından kişisel olarak işletilmektedir.
          6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri
          sorumlusu odur. İletişim:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="İşlenen veriler">
        <h3 className="font-medium text-foreground">1. Ziyaret istatistikleri</h3>
        <p>
          Hangi sayfaların ne kadar okunduğunu görmek için Vercel Web Analytics
          kullanılır. Kaydedilen bilgiler: ziyaret edilen sayfa adresi, sizi
          yönlendiren site, ülke, tarayıcı, işletim sistemi ve cihaz türü.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>Çerez kullanılmaz.</li>
          <li>
            Ziyaretçiler, isteğin kendisinden üretilen bir özetle (hash) ayırt
            edilir; bu özet saklanmaz ve 24 saat sonra geçersiz olur.
          </li>
          <li>IP adresiniz istatistiklerle ilişkilendirilmez ve saklanmaz.</li>
          <li>Sonuçlar yalnızca toplu sayılar olarak görülür; kim olduğunuz bilinemez.</li>
        </ul>
        <p>
          Hukuki sebep: sitenin işletilmesi ve iyileştirilmesine yönelik meşru
          menfaat (KVKK m. 5/2-f).
        </p>

        <h3 className="mt-4 font-medium text-foreground">2. Sunucu kayıtları</h3>
        <p>
          Site Vercel Inc. (ABD) altyapısında barındırılır. Her web sitesinde
          olduğu gibi, sayfa isteklerinin teknik kayıtları (IP adresi, zaman,
          istenen adres) güvenlik ve işletim amacıyla barındırma sağlayıcısı
          tarafından kısa süreliğine tutulur. Bu kayıtlar{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Vercel&apos;in gizlilik politikası
          </a>{" "}
          kapsamındadır; site işleteni bunları ziyaretçileri tanımak için
          kullanmaz. Veriler yurt dışındaki sunucularda işlenir.
        </p>

        <h3 className="mt-4 font-medium text-foreground">3. Tema tercihi</h3>
        <p>
          Açık/koyu tema seçiminiz yalnızca kendi tarayıcınızda (localStorage)
          saklanır, sunucuya gönderilmez. Tarayıcı verilerinizi silerek
          kaldırabilirsiniz.
        </p>

        <h3 className="mt-4 font-medium text-foreground">4. E-posta yazışmaları</h3>
        <p>
          Bize e-posta gönderirseniz adresiniz ve mesajınız yalnızca yanıt
          vermek için kullanılır, üçüncü kişilerle paylaşılmaz ve listeye
          eklenmez.
        </p>
      </Section>

      <Section title="İşlenmeyenler">
        <p>
          Üyelik, bülten, yorum ya da iletişim formu yoktur. Reklam ve
          reklam/izleme amaçlı üçüncü taraf betikleri kullanılmaz. Takvim
          aboneliği ve RSS akışı herkese açık dosyalardır; abone olduğunuzda
          size ait bir bilgi kaydedilmez.
        </p>
      </Section>

      <Section title="Haklarınız">
        <p>
          KVKK m. 11 uyarınca kişisel verilerinizin işlenip işlenmediğini
          öğrenme, bilgi talep etme, düzeltilmesini ya da silinmesini isteme ve
          itiraz etme haklarına sahipsiniz. Başvurularınızı{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          adresine iletebilirsiniz. Ziyaret istatistikleri kimliğinizle
          ilişkilendirilmediği için bu verilerde size ait bir kaydı bulmak
          teknik olarak mümkün değildir.
        </p>
      </Section>

      <Section title="Dış bağlantılar">
        <p>
          Sitedeki kaynak bağlantıları (merkez bankaları, BIS, Atlanta Fed)
          kendi gizlilik politikalarına tabi sitelere götürür.
        </p>
      </Section>

      <p className="text-sm text-muted">
        Son güncelleme: {UPDATED} ·{" "}
        <Link href="/iletisim" className="text-accent hover:underline">
          İletişim
        </Link>
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="prose-width space-y-3 text-muted">{children}</div>
    </section>
  );
}
