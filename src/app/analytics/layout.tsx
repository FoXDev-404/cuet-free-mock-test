import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Performance analytics",
  robots: NOINDEX_ROBOTS,
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
