/**
 * Tema tercihinin localStorage anahtarı.
 *
 * Bu sabit kasıtlı olarak AYRI bir modülde: hem sunucu bileşeni olan
 * layout.tsx (yanıp sönmeyi önleyen inline script için) hem de istemci
 * bileşeni ThemeToggle kullanıyor.
 *
 * Sabiti ThemeToggle'dan dışa aktarmak sessizce bozuluyordu: bir sunucu
 * bileşeni `"use client"` modülünden değer içe aktardığında gerçek değeri
 * değil bir istemci referansı alır, bu yüzden script'e
 * `localStorage.getItem(undefined)` olarak gömülüyordu — hata vermeden,
 * ama tema tercihini her sayfa yüklemesinde unutarak.
 */
export const THEME_KEY = "mbr-theme";
