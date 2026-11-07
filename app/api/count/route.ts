// The public "texts read" total for the home page.
import { rpc } from "@/lib/server/supabase";

export async function GET() {
  try {
    const total = Number(await rpc<number>("plays_total", {}));
    return Response.json(
      { total: Number.isFinite(total) ? total : null },
      // Vercel's edge keeps the number for a minute, so the database isn't asked on every visit.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json({ total: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
