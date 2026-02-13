"use client";

import { useState } from "react";

export default function SubmitPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: data.get("brand"),
          model: data.get("model"),
          product_url: data.get("product_url"),
          contact_email: data.get("contact_email") || undefined,
          notes: data.get("notes") || undefined,
        }),
      });
      if (res.ok) {
        setStatus("ok");
        form.reset();
      } else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Submit a Paddle</h1>
      <p className="mt-2 text-slate-600">
        Suggest a paddle to add. We only need a product URL; brand and model
        help us match it.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-slate-700">
            Brand
          </label>
          <input
            id="brand"
            name="brand"
            type="text"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-slate-700">
            Model
          </label>
          <input
            id="model"
            name="model"
            type="text"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="product_url" className="block text-sm font-medium text-slate-700">
            Product URL <span className="text-slate-500">(required)</span>
          </label>
          <input
            id="product_url"
            name="product_url"
            type="url"
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-slate-700">
            Contact email (optional)
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Submit"}
        </button>
      </form>

      {status === "ok" && (
        <p className="mt-4 text-sm text-green-700">
          Thanks. Your submission was received.
        </p>
      )}
      {status === "error" && (
        <p className="mt-4 text-sm text-red-700">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
