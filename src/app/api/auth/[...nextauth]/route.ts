import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

// Note: Next.js 16 renamed the middleware convention to src/proxy.ts; it
// gates /admin only. /api/auth/* is handled entirely by next-auth here.
const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;
