"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Site sahibinin kendi ziyaretleri sayılmasın: ayda ~40 Türk okurun olduğu
// yerde sahibin gezinmesi rakamı belirgin biçimde şişiriyordu (Kasım 2026).
// Tarayıcıda bir kez `?olcum=kapat` ile açmak yeter; `?olcum=ac` geri alır.
// beforeSend bir fonksiyon olduğu için sunucu bileşeninden geçirilemiyor.
const KEY = "faizradar-olcum-kapali";

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const flag = new URL(event.url).searchParams.get("olcum");
    if (flag === "kapat") localStorage.setItem(KEY, "1");
    if (flag === "ac") localStorage.removeItem(KEY);
    if (localStorage.getItem(KEY) === "1") return null;
  } catch {
    // Depolama kapalıysa (gizli pencere) ziyaret sayılır.
  }
  return event;
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
