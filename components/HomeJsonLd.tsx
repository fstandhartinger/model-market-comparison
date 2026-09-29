import { BRAND_CLAIM, BRAND_LINE, SITE_URL } from "../lib/seo";

// CR-171 (seo-router-sites, 26 Sep 2026): WebSite, Organization and Dataset structured data for the home page.
// The Dataset counts are the same three numbers the hero line prints, passed in from the page, so the markup
// never claims more than the visible page. Licence: the code is MIT; third-party data keeps its own terms, so
// the Dataset names no licence of its own.
export function HomeJsonLd({ results, benchmarks, models, updated }: { results: number; benchmarks: number; models: number; updated: string }) {
  const org = { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Benchmark Heaven", url: SITE_URL,
    logo: `${SITE_URL}/apple-icon.png`, sameAs: ["https://github.com/fstandhartinger/model-market-comparison", "https://x.com/benchmarkheaven"] };
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Benchmark Heaven", alternateName: "JevBench by Benchmark Heaven",
        url: SITE_URL, description: `${BRAND_CLAIM} ${BRAND_LINE}`, publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: "en" },
      org,
      { "@type": "Dataset", "@id": `${SITE_URL}/#dataset`, name: "Benchmark Heaven LLM benchmark and cost dataset",
        description: `${results.toLocaleString("en-US")} benchmark results across ${benchmarks} benchmarks and ${models.toLocaleString("en-US")} models, each with its source and date, plus provider prices, caching and token-use data used to model cost per task.`,
        url: SITE_URL, isAccessibleForFree: true, creator: { "@id": `${SITE_URL}/#organization` },
        ...(/^\d{4}-\d{2}-\d{2}$/.test(updated) ? { dateModified: updated } : {}),
        keywords: ["LLM benchmarks", "AI model pricing", "cost per task", "model comparison"],
        conditionsOfAccess: "Code under the MIT licence; third-party benchmark data keeps its own terms (see /about).",
        distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE_URL}/api/dataset` }] },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />;
}
