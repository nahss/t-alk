// Keeps the Phase 1 voice test page private.
// The browser asks for a password; it must match TEST_PAGE_PASSWORD
// (set in .env.local and in Vercel). If that setting is missing, the
// test page and its server functions don't exist at all (404).
import { NextResponse, type NextRequest } from "next/server";

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.TEST_PAGE_PASSWORD;
  if (!password) return new NextResponse("Not found", { status: 404 });

  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  if (scheme?.toLowerCase() === "basic" && encoded) {
    let decoded = "";
    try {
      decoded = atob(encoded);
    } catch {
      decoded = "";
    }
    const colon = decoded.indexOf(":");
    if (colon >= 0 && sameText(decoded.slice(colon + 1), password)) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }

  return new NextResponse("Password needed", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Talk voice test", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const config = {
  matcher: ["/test", "/test/:path*", "/api/test/:path*"],
};
