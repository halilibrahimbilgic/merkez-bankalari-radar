import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Veri hatası bildirimi, öneri ve sorular için iletişim.",
};

/**
 * Form yok, bilinçli olarak: form kişisel veri toplamak, saklamak ve spam
 * korumasıyla uğraşmak demek (bkz. /gizlilik). Doğrudan e-posta aynı işi
 * görür ve ziyaretçinin verisi bizim sistemimize hiç girmez.
 */
export default function ContactPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">İletişim</h1>
        <p className="prose-width mt-2 text-muted">
          Hatalı bir veri, eksik bir toplantı ya da bir öneri mi fark ettiniz?
          Haber vermeniz siteyi doğrudan iyileştirir.
        </p>
      </header>

      <section className="card p-5">
        <div className="text-sm text-muted">E-posta</div>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-1 inline-block text-lg font-semibold text-accent hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
        <p className="prose-width mt-2 text-sm text-muted">
          Kişisel bir proje olduğu için yanıt süresi değişebilir.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Veri hatası bildirirken</h2>
        <ul className="prose-width list-inside list-disc space-y-1 text-muted">
          <li>Hatanın göründüğü sayfanın adresi</li>
          <li>Sitede yazan değer ve doğrusu</li>
          <li>Mümkünse doğru değerin resmî kaynağı (merkez bankasının duyurusu)</li>
        </ul>
        <p className="prose-width mt-3 text-muted">
          Veriler her gün resmî kaynaklardan otomatik çekilir; bir hata çoğunlukla
          kaynağın biçim değiştirmesinden kaynaklanır ve hızlıca düzeltilebilir.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Teknik konular</h2>
        <p className="prose-width text-muted">
          Sitenin kaynak kodu açıktır. Hata kayıtları ve öneriler için{" "}
          <a
            href={`${REPO_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            GitHub üzerinden kayıt açabilirsiniz
          </a>
          .
        </p>
      </section>

      <p className="prose-width text-sm text-muted">
        Bireysel yatırım sorularına yanıt verilmez; bu site yatırım tavsiyesi
        vermez. Kişisel verilerle ilgili başvurular için{" "}
        <Link href="/gizlilik" className="text-accent hover:underline">
          gizlilik sayfasına
        </Link>{" "}
        bakın.
      </p>
    </div>
  );
}
