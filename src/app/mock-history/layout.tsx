import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mock test history",
  robots: NOINDEX_ROBOTS,
};

export default function MockHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
