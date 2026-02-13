const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paddle-intelligence.vercel.app";

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
