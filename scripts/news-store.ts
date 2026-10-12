/** data/news/news.json okuma/yazma — news-fetch, news-import ve post-telegram ortak kullanır. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NewsStore } from "../src/lib/news";

export const NEWS_STORE = path.join(process.cwd(), "data", "news", "news.json");

/** Bağlantıdan türeyen kimlik: aynı haber her koşuda aynı kimliği alır. */
export function newsId(url: string): string {
  return createHash("sha1")
    .update(url.replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .digest("hex")
    .slice(0, 12);
}

export async function loadNewsStore(): Promise<NewsStore> {
  try {
    return JSON.parse(await readFile(NEWS_STORE, "utf8")) as NewsStore;
  } catch {
    return { fetchedAt: new Date(0).toISOString(), items: [], rejected: {} };
  }
}

export async function saveNewsStore(store: NewsStore) {
  await mkdir(path.dirname(NEWS_STORE), { recursive: true });
  await writeFile(NEWS_STORE, JSON.stringify(store, null, 2) + "\n");
}
