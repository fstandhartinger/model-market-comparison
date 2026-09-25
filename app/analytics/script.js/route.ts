const UMAMI_ORIGIN = "https://bh-analytics.app.mintapis.com";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await fetch(`${UMAMI_ORIGIN}/script.js`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok || !upstream.body) return new Response(null, { status: 502 });

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
