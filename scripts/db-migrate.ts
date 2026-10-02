/**
 * db/migrations/*.sql dosyalarını sırayla uygular.
 *
 *   DATABASE_URL=postgres://... npm run db:migrate
 *
 * Her dosya tek bir transaction içinde çalışır ve adı schema_migrations'a
 * yazılır; ikinci çalıştırmada atlanır. Dosya içeriği değişse bile yeniden
 * uygulanmaz — uygulanmış bir göçü düzenlemek yerine yeni bir dosya ekleyin,
 * aksi halde geliştirme ve üretim şemaları sessizce ayrışır.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const DIR = path.join(process.cwd(), "db", "migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL tanımlı değil.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  // Çalıştırıcı kendi defterini kurar: 001_init.sql de aynı tabloyu
  // "if not exists" ile tanımlar, böylece şema dosyası tek başına da
  // (psql ile elle) uygulanabilir kalır.
  await pool.query(`
    create table if not exists schema_migrations (
      version    text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await pool.query<{ version: string }>(
    "select version from schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.version));

  const files = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`· ${file} (zaten uygulanmış)`);
      continue;
    }

    const sql = await readFile(path.join(DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (version) values ($1)", [
        file,
      ]);
      await client.query("commit");
      console.log(`✓ ${file}`);
      count++;
    } catch (err) {
      await client.query("rollback");
      console.error(`✗ ${file} → ${(err as Error).message}`);
      process.exitCode = 1;
      return;
    } finally {
      client.release();
    }
  }

  console.log(
    count === 0 ? "Şema güncel." : `${count} göç uygulandı.`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
