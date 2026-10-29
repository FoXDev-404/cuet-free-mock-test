import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;
      // Public paths
      if (
        pathname === "/login" ||
        pathname === "/register" ||
        pathname.startsWith("/api/") ||
        pathname === "/" ||
        pathname.startsWith("/mock-tests") ||
        pathname.startsWith("/practice") ||
        pathname.startsWith("/pyq") ||
        pathname.startsWith("/cuet-") ||
        pathname === "/blog" ||
        pathname === "/about" ||
        pathname === "/contact" ||
        pathname.startsWith("/privacy-policy") ||
        pathname.startsWith("/terms") ||
        pathname.startsWith("/disclaimer")
      ) {
        return true;
      }
      // Protected routes require a token
      return !!token;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/mock-tests/:path*/take"],
};
