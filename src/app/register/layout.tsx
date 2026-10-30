import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Create an account",
  robots: NOINDEX_ROBOTS,
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
