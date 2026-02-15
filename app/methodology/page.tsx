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
            Primary sources include the USA Pickleball approved paddle list
            (equipment.usapickleball.org), official brand product pages, and
            major retailer listings. The USAP list is synced periodically to
            keep approval status and new paddles up to date. Where possible we
            link to the source and record the hostname and last verification
            date.
          </p>
          <p className="mt-2">
            Many paddles in the index appear from the USAP list only (brand,
            model, and approval status). Thickness, weight, face and core
            materials, and MSRP are filled in where we have scraped
            brand/retailer product pages or imported curated CSV data (e.g.{" "}
            <a
              href="https://theslicepickleball.com/pickleball-paddle-database/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-800 underline"
            >
              The Slice Pickleball
            </a>{" "}
            paddle stats, Pickleball Effect master sheet). Where
            we have permission, we also use lab-measured data (e.g.{" "}
            <a
              href="https://www.johnkewpickleball.com/paddle-database"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-800 underline"
            >
              JohnKew Pickleball
            </a>{" "}
            paddle database) for thickness and weight; use is subject to their{" "}
            <a
              href="https://www.johnkewpickleball.com/content-usage-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-800 underline"
            >
              Content Usage Policy
            </a>
            . Rows without those fields are listing-only until additional
            sources are added.
          </p>
          <p className="mt-2">
            Other paddle databases you may find useful:{" "}
            <a
              href="https://www.pickleballbase.co/database"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-800 underline"
            >
              Pickleball Base
            </a>
            ,{" "}
            <a
              href="https://www.mattspickleball.com/all-paddles"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-800 underline"
            >
              Matt&apos;s Pickleball
            </a>
            . We do not currently ingest from these; they are listed for reference.
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
