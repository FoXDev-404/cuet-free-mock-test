import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminRole } from "@/lib/auth/permissions";

// Next.js 16 replaced the middleware convention with proxy.ts (the function
// must be exported as `proxy`, even alongside a default export).
//
// Scope: /admin is the only server-side-gated area. All client pages render
// publicly (the site is a free mock-test platform; anonymous practice flows
// rely on client-side session state), and every /api/admin/* route is guarded
// inside the handler via requireAdmin().
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  if (!isAdminRole((token as { role?: string }).role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

// Avoid running on framework assets and metadata files.
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
