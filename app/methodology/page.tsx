export const metadata = {
  title: "Methodology – Pickleball Paddle Index",
  description:
    "How we collect and normalize paddle data. Public sources only, no manual testing.",
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Methodology</h1>

      <section className="mt-8 space-y-6 text-slate-700">
        <div>
          <h2 className="text-lg font-medium text-slate-900">
            Public data only
          </h2>
          <p>
            All data in this index is derived from publicly available sources.
            We do not conduct manual testing, playtests, or reviews. No data is
            paywalled or from private agreements.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-slate-900">Sources</h2>
          <p>
            Primary sources include USAP-approved paddle listings, official brand
            product pages, and major retailer listings. Where possible we link
            to the source and record the hostname and last verification date.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-slate-900">
            Data normalization
          </h2>
          <p>
            Thickness is normalized to millimeters; weight to a min–max range
            where available. Face and core materials are standardized to a
            common vocabulary. Thermoformed and USAP status are recorded as
            reported by sources.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-slate-900">Limitations</h2>
          <p>
            We do not verify specs in a lab. Data can be outdated or incorrect.
            Brands may change specs without notice. Use this index as a
            research and discovery tool, not as a sole source of truth for
            purchasing decisions.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-slate-900">Update policy</h2>
          <p>
            The index is updated periodically from the same public sources.
            Submissions via the form are reviewed and may be incorporated in a
            future run. We do not guarantee timelines for updates.
          </p>
        </div>
      </section>
    </div>
  );
}
