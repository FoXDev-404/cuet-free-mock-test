import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

// Note: next-auth v4 cookie decoding for Next.js 16 happens in middleware.ts
// (request header rewrite for /api/auth/*); do not strip it without reading
// the comment there.
const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;
