// Called on the first Play of a new text: applies the hourly limit for this browser.
// If the database can't be reached, Talk lets the read go ahead (it never blocks on our side).
import { fromOurSite, json } from "@/lib/server/request";
import { hashBrowser, rpc, signTicket } from "@/lib/server/supabase";
import { HOURLY_LIMIT } from "@/lib/limits";

type Row = { allowed: boolean; read_id: number | null; unlock_at: string | null };

export async function POST(request: Request) {
  if (!fromOurSite(request)) return json({ error: "Not allowed" }, 403);
  const body = await request.json().catch(() => null);
  const browser = body?.browser;
  if (typeof browser !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(browser)) {
    return json({ error: "Bad browser id" }, 400);
  }

  try {
    const rows = await rpc<Row[]>("try_read", { p_browser: hashBrowser(browser), p_limit: HOURLY_LIMIT });
    const row = rows[0];
    if (!row) throw new Error("no answer");
    if (!row.allowed) return json({ allowed: false, unlockAt: row.unlock_at });
    return json({ allowed: true, ticket: row.read_id != null ? signTicket(row.read_id) : null });
  } catch {
    return json({ allowed: true, ticket: null });
  }
}
