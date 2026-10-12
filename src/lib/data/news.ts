import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NewsItem, NewsStore } from "../news";

const STORE_PATH = path.join(process.cwd(), "data", "news", "news.json");

/**
 * Haber akışı — veritabanı modunda da dosyadan okunur: 30 dakikada bir
 * tamamen yenilenen, türetilmiş bir anlık görüntü (bkz. expectations.ts).
 */
let cache: NewsStore | undefined;

async function load(): Promise<NewsStore> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(STORE_PATH, "utf8")) as NewsStore;
  } catch {
    cache = { fetchedAt: new Date(0).toISOString(), items: [], rejected: {} };
  }
  return cache;
}

export async function getNews(opts: { limit?: number; kind?: NewsItem["kind"] } = {}): Promise<NewsItem[]> {
  const { items } = await load();
  const rows = items
    .filter((i) => !opts.kind || i.kind === opts.kind)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}
