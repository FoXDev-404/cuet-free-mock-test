import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Attempt result",
  robots: NOINDEX_ROBOTS,
};

export default function AttemptResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
