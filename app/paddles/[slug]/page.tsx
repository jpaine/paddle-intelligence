import { notFound } from "next/navigation";
import Link from "next/link";
import { getPaddleBySlug } from "@/src/data/paddles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPaddleBySlug(slug);
  const paddle = result?.paddle;
  if (!paddle) return { title: "Paddle Not Found – Pickleball Paddle Index" };
  const descParts = [];
  if (paddle.thicknessMm != null) descParts.push(`${paddle.thicknessMm}mm`);
  if (paddle.faceMaterial) descParts.push(paddle.faceMaterial);
  if (paddle.coreMaterial) descParts.push(paddle.coreMaterial);
  const description =
    descParts.length > 0
      ? `${paddle.brand} ${paddle.model} – ${descParts.join(", ")}. Pickleball Paddle Index.`
      : `${paddle.brand} ${paddle.model} – Pickleball Paddle Index.`;
  return {
    title: `${paddle.brand} ${paddle.model} – Pickleball Paddle Index`,
    description,
  };
}

export default async function PaddlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPaddleBySlug(slug);
  if (!result) notFound();
  const { paddle, sources: paddleSourceRows } = result;

  const weightRange =
    paddle.weightMin != null && paddle.weightMax != null
      ? `${paddle.weightMin}–${paddle.weightMax} oz`
      : paddle.weightMin != null
        ? `${paddle.weightMin}+ oz`
        : paddle.weightMax != null
          ? `up to ${paddle.weightMax} oz`
          : "—";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paddle-intelligence.vercel.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${paddle.brand} ${paddle.model}`,
    brand: { "@type": "Brand", name: paddle.brand },
    description: `Pickleball paddle: ${paddle.faceMaterial ?? "—"} face, ${paddle.coreMaterial ?? "—"} core${paddle.thicknessMm != null ? `, ${paddle.thicknessMm}mm` : ""}.`,
    ...(paddle.msrpUsd != null && {
      offers: {
        "@type": "Offer",
        price: paddle.msrpUsd,
        priceCurrency: "USD",
      },
    }),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/paddles"
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        ← Database
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">
        {paddle.brand} {paddle.model}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {paddle.thicknessMm != null || paddle.faceMaterial != null
          ? "Data: full specs from brand or curated source."
          : "Data: USAP listing only; specs not yet added."}
      </p>

      <dl className="mt-8 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-500">Thickness</dt>
          <dd className="text-slate-900">
            {paddle.thicknessMm != null ? `${paddle.thicknessMm} mm` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Weight range</dt>
          <dd className="text-slate-900">{weightRange}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Face material</dt>
          <dd className="text-slate-900">{paddle.faceMaterial ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Core material</dt>
          <dd className="text-slate-900">{paddle.coreMaterial ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Thermoformed</dt>
          <dd className="text-slate-900">{paddle.thermoformed ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">MSRP</dt>
          <dd className="text-slate-900">
            {paddle.msrpUsd != null ? `$${paddle.msrpUsd}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Release year</dt>
          <dd className="text-slate-900">{paddle.releaseYear ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">USAP approved</dt>
          <dd className="text-slate-900">
            {paddle.usapApproved ? "Yes" : "No"}
          </dd>
        </div>
      </dl>

      {paddleSourceRows.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-medium text-slate-900">Sources</h2>
          <ul className="mt-2 space-y-2">
            {paddleSourceRows.map((s, i) => (
              <li key={i} className="text-sm">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 hover:underline"
                >
                  {s.hostname}
                </a>
                {s.lastVerified && (
                  <span className="ml-2 text-slate-500">
                    (verified {s.lastVerified.toLocaleDateString()})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
        This page is generated from publicly available data. If you are a brand
        and would like to update information, submit via the{" "}
        <Link href="/submit" className="text-slate-700 hover:underline">
          form
        </Link>
        .
      </p>
    </div>
  );
}
