import { Pool } from "pg";

/**
 * Veritabanı isteğe bağlıdır: DATABASE_URL yoksa uygulama
 * data/seed/*.json dosyalarından okur. Bu sayede arayüz
 * Supabase/Neon kurulumunu beklemeden çalışır.
 *
 * DATABASE_URL tanımlıysa TÜM okuma modülleri (toplantılar, konuşmalar,
 * güncel faizler, olasılıklar) veritabanından okur — karışık durum yok.
 * Şemayı kurmak için: npm run db:migrate && npm run db:import
 */
let pool: Pool | null | undefined;

export function getPool(): Pool | null {
  if (pool !== undefined) return pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    pool = null;
    return pool;
  }

  pool = new Pool({
    connectionString: url,
    max: 5,
    ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  return pool;
}
