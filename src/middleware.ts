import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Middleware: protect /family routes (request boundary check)
//
// This is a lightweight cookie existence check. It does NOT validate the
// session against the database - that happens server-side in the page via
// auth(). This keeps middleware Edge-compatible (no Prisma import chain).
//
// Per AGENTS.md: "Middleware may help at the request boundary, but field-
// level privacy enforcement must live in the reusable server-side utility."
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "authjs.session-token";

const PROTECTED_PREFIXES = ["/family", "/schedule"];

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    nextUrl.pathname.startsWith(prefix),
  );

  if (isProtected) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE);
    if (!sessionCookie?.value) {
      // Redirect unauthenticated users to the home page
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on protected prefixes for efficiency
  matcher: ["/family/:path*", "/schedule/:path*", "/schedule"],
};