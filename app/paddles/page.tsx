import Link from "next/link";
import { getPaddlesList } from "@/src/data/paddles";

const PAGE_SIZE = 20;

export default async function PaddlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let items: {
    slug: string;
    brand: string;
    model: string;
    thicknessMm: number | null;
    weightMin: number | null;
    weightMax: number | null;
    faceMaterial: string | null;
    coreMaterial: string | null;
    usapApproved: boolean | null;
  }[] = [];
  let total = 0;
  try {
    const result = await getPaddlesList({
      sort: "brand",
      order: "asc",
      limit: PAGE_SIZE,
      offset,
    });
    total = result.total;
    items = result.items.map((r) => ({
      slug: r.slug,
      brand: r.brand,
      model: r.model,
      thicknessMm: r.thicknessMm,
      weightMin: r.weightMin,
      weightMax: r.weightMax,
      faceMaterial: r.faceMaterial,
      coreMaterial: r.coreMaterial,
      usapApproved: r.usapApproved,
    }));
  } catch {
    // empty
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Paddle Database</h1>
      <p className="mt-2 text-slate-600">
        Browse paddles. Filter and sort via API (e.g. /api/paddles?sort=thickness).
      </p>

      {items.length === 0 ? (
        <div className="mt-10 rounded border border-slate-200 bg-slate-50/50 p-8 text-center text-slate-600">
          No paddles in the database yet. Run the import script or submit a paddle
          to get started.
        </div>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 font-medium text-slate-900">Brand</th>
                  <th className="py-3 font-medium text-slate-900">Model</th>
                  <th className="py-3 font-medium text-slate-900 w-24">Specs</th>
                  <th className="py-3 font-medium text-slate-900">Thickness</th>
                  <th className="py-3 font-medium text-slate-900">Weight range</th>
                  <th className="py-3 font-medium text-slate-900">Face</th>
                  <th className="py-3 font-medium text-slate-900">Core</th>
                  <th className="py-3 font-medium text-slate-900">USAP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const hasFullSpecs = row.thicknessMm != null || row.faceMaterial != null;
                  return (
                  <tr key={row.slug} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{row.brand}</td>
                    <td className="py-2">
                      <Link
                        href={`/paddles/${row.slug}`}
                        className="text-slate-900 hover:underline"
                      >
                        {row.model}
                      </Link>
                    </td>
                    <td className="py-2">
                      {hasFullSpecs ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600" title="Thickness, materials, or other specs available">
                          Full specs
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400" title="USAP listing only; specs not yet added">
                          Listing only
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-600">
                      {row.thicknessMm != null ? `${row.thicknessMm} mm` : "—"}
                    </td>
                    <td className="py-2 text-slate-600">
                      {row.weightMin != null && row.weightMax != null
                        ? `${row.weightMin}–${row.weightMax} oz`
                        : row.weightMin != null
                          ? `${row.weightMin}+ oz`
                          : row.weightMax != null
                            ? `≤${row.weightMax} oz`
                            : "—"}
                    </td>
                    <td className="py-2 text-slate-600">{row.faceMaterial ?? "—"}</td>
                    <td className="py-2 text-slate-600">{row.coreMaterial ?? "—"}</td>
                    <td className="py-2">
                      {row.usapApproved ? (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                          USAP
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {hasPrev && (
                <Link
                  href={`/paddles?page=${page - 1}`}
                  className="text-sm text-slate-600 hover:underline"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              {hasNext && (
                <Link
                  href={`/paddles?page=${page + 1}`}
                  className="text-sm text-slate-600 hover:underline"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
