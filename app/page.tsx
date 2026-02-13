import Link from "next/link";
import { db } from "@/src/db";
import { paddles, jobRuns } from "@/src/db/schema";
import { desc, sql } from "drizzle-orm";

async function getStats() {
  try {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paddles);
    const totalPaddles = countResult?.count ?? 0;

    const [brandsResult] = await db
      .select({ count: sql<number>`count(distinct ${paddles.brand})::int` })
      .from(paddles);
    const totalBrands = brandsResult?.count ?? 0;

    const [lastRun] = await db
      .select({ completedAt: jobRuns.completedAt })
      .from(jobRuns)
      .where(sql`${jobRuns.completedAt} is not null`)
      .orderBy(desc(jobRuns.completedAt))
      .limit(1);
    const lastUpdated = lastRun?.completedAt ?? null;

    const [lastPaddle] = await db
      .select({ updatedAt: paddles.updatedAt })
      .from(paddles)
      .orderBy(desc(paddles.updatedAt))
      .limit(1);

    const fallbackUpdated =
      lastPaddle?.updatedAt ?? (lastUpdated ?? new Date(0));
    const displayUpdated =
      lastUpdated && lastUpdated > fallbackUpdated ? lastUpdated : fallbackUpdated;

    return {
      totalPaddles,
      totalBrands,
      lastUpdated:
        displayUpdated.getTime() > 0
          ? displayUpdated.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
    };
  } catch {
    return {
      totalPaddles: 0,
      totalBrands: 0,
      lastUpdated: "—",
    };
  }
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
        Pickleball Paddle Index
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Structured data on commercial pickleball paddles—thickness, materials,
        pricing. Independent, public-data research platform.
      </p>

      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        <div className="rounded border border-slate-200 bg-slate-50/50 p-4">
          <div className="text-2xl font-semibold text-slate-900">
            {stats.totalPaddles}
          </div>
          <div className="text-sm text-slate-600">Paddles</div>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50/50 p-4">
          <div className="text-2xl font-semibold text-slate-900">
            {stats.totalBrands}
          </div>
          <div className="text-sm text-slate-600">Brands</div>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50/50 p-4">
          <div className="text-2xl font-semibold text-slate-900">
            {stats.lastUpdated}
          </div>
          <div className="text-sm text-slate-600">Last updated</div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/paddles"
          className="inline-flex items-center justify-center rounded bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Explore Database
        </Link>
        <Link
          href="/methodology"
          className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Methodology
        </Link>
        <Link
          href="/submit"
          className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Submit a Paddle
        </Link>
      </div>

      <p className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-600">
        All data is from public sources (USAP, brand sites, retailers). We do
        not run reviews or tests. See Methodology for sources and limitations.
      </p>
    </div>
  );
}
