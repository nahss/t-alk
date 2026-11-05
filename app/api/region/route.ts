// Tells the home screen whether language options can be offered here.
// The country is read from Vercel's header for this request only; it's never stored.
import { json, translationAllowed } from "@/lib/server/request";

export async function GET(request: Request) {
  return json({ languages: translationAllowed(request) });
}
