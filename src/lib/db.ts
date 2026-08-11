import { Pool } from "pg";

/**
 * MVP'de veritabanı isteğe bağlıdır: DATABASE_URL yoksa uygulama
 * data/seed/*.json dosyalarından okur. Bu sayede Faz 1 arayüzü
 * Supabase/Neon kurulumunu beklemeden çalışır.
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

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
