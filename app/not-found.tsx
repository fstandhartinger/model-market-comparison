import Link from "next/link";

export const metadata = { title: "Page not found" };

/** CR-63.10: a themed 404 inside the site shell (Next's default rendered an unstyled white page). Status stays 404. */
export default function NotFound() {
  return (
    <section className="bh-panel mx-auto my-12 max-w-lg p-6 text-center">
      <p className="bh-eyebrow">404</p>
      <h1 className="mt-1 text-xl font-semibold">This page doesn&apos;t exist.</h1>
      <p className="bh-muted mt-2 text-sm">The link may be old, or the model may have been renamed or retired from the catalog.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link href="/" className="bh-button border-accent bg-accent text-white hover:bg-accent/90">Back to the overview</Link>
        <Link href="/compare" className="bh-button">Search a model</Link>
        <Link href="/benchmarks" className="bh-button">All benchmarks</Link>
      </div>
    </section>
  );
}
