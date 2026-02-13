import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pickleball Paddle Index – Data & Analytics on Commercial Pickleball Paddles",
  description:
    "Explore structured data on commercial pickleball paddles including thickness, core material, construction type, and pricing. Independent, public-data research platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <header className="border-b border-slate-200">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-4">
            <Link
              href="/"
              className="text-lg font-semibold text-slate-900 hover:text-slate-700"
            >
              Pickleball Paddle Index
            </Link>
            <ul className="flex gap-6">
              <li>
                <Link
                  href="/"
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/paddles"
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Database
                </Link>
              </li>
              <li>
                <Link
                  href="/methodology"
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Methodology
                </Link>
              </li>
              <li>
                <Link
                  href="/submit"
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Submit a Paddle
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="border-t border-slate-200 py-8">
          <div className="mx-auto max-w-5xl px-4 text-center text-sm text-slate-500">
            Pickleball Paddle Index — public data only. No reviews, no affiliate
            content.
          </div>
        </footer>
      </body>
    </html>
  );
}
