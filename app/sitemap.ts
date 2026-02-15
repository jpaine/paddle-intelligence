import { getPaddleSlugs } from "@/src/data/paddles";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paddle-intelligence.vercel.app";

export default async function sitemap() {
  let slugs: string[] = [];
  try {
    slugs = await getPaddleSlugs();
  } catch {
    // ignore
  }

  const paddleUrls = slugs.map((slug) => ({
    url: `${BASE}/paddles/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE}/paddles`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE}/methodology`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/submit`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    ...paddleUrls,
  ];
}
