// Supabase, used only on the server with the secret key (never sent to the browser).
// Talk only calls the functions defined in supabase/schema.sql.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase isn't set up");
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${fn} ${res.status}`);
  return res.json() as Promise<T>;
}

/** The browser's random id, scrambled before it's stored. */
export const hashBrowser = (id: string) => createHash("sha256").update(`talk-browser:${id}`).digest("hex");

// A "ticket" proves a play log belongs to a read the hourly limit allowed,
// so nobody can inflate the counter by calling the log route directly.
const signingKey = () =>
  createHash("sha256").update(`talk-read-ticket:${process.env.SUPABASE_SECRET_KEY ?? ""}`).digest();

export function signTicket(readId: number) {
  const sig = createHmac("sha256", signingKey()).update(String(readId)).digest("base64url");
  return `${readId}.${sig}`;
}

export function readTicket(ticket: string): number | null {
  const [id, sig] = ticket.split(".");
  if (!id || !/^\d{1,18}$/.test(id) || !sig) return null;
  const expected = createHmac("sha256", signingKey()).update(id).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Number(id);
}
