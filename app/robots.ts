import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";

// CR-62.2: a real robots.txt (the path used to fall through to the app's 404 page).
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/account"] }], sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}
