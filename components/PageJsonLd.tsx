import type { Metadata } from "next";
import { DEFAULT_DESCRIPTION, SITE_URL } from "../lib/seo";

// bh-onpage (22 Oct 2026): WebPage structured data for pages that carry no JSON-LD of their own, built from
// the page's own metadata so name, description and URL always match the head. Nested paths add a
// BreadcrumbList; methodology pages add a TechArticle. No Dataset, Review, rating, score or rank values.
// Intermediate crumbs are only the parent pages that exist (there is no /models index, for example).
const CRUMBS: Record<string, string> = { "/jev-models": "JevBench", "/jev-models/methodology": "JevBench methodology", "/image-jev-bench": "ImageJevBench" };

function titleText(title: Metadata["title"]): string {
  if (!title) return "Benchmark Heaven";
  if (typeof title === "string") return title;
  return "absolute" in title && title.absolute ? title.absolute : String((title as { default?: string }).default ?? "Benchmark Heaven");
}

export function PageJsonLd({ meta, article }: { meta: Metadata; article?: { dateModified?: string } }) {
  const path = new URL(String(meta.alternates?.canonical ?? "/"), SITE_URL).pathname;
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const name = titleText(meta.title);
  const description = meta.description ?? DEFAULT_DESCRIPTION;
  const segments = path.split("/").filter(Boolean);
  const graph: Record<string, unknown>[] = [
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name, description, inLanguage: "en",
      isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Benchmark Heaven", url: SITE_URL },
      ...(segments.length > 1 ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}) },
  ];
  if (segments.length > 1) {
    const parents = segments.slice(0, -1).map((_, i) => `/${segments.slice(0, i + 1).join("/")}`).filter((crumb) => CRUMBS[crumb]);
    const crumbs = [{ name: "Benchmark Heaven", item: SITE_URL }, ...parents.map((crumb) => ({ name: CRUMBS[crumb], item: `${SITE_URL}${crumb}` })), { name, item: url }];
    graph.push({ "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, ...c })) });
  }
  if (article) graph.push({ "@type": "TechArticle", "@id": `${url}#article`, headline: name, description, url,
    mainEntityOfPage: { "@id": `${url}#webpage` }, ...(article.dateModified ? { dateModified: article.dateModified } : {}),
    author: { "@type": "Organization", name: "Benchmark Heaven", url: SITE_URL }, publisher: { "@type": "Organization", name: "Benchmark Heaven", url: SITE_URL } });
  const json = { "@context": "https://schema.org", "@graph": graph };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />;
}
