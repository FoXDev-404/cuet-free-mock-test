import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Verify email",
  robots: NOINDEX_ROBOTS,
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
