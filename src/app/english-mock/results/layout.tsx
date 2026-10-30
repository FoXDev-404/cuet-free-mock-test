import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "English mock test result",
  robots: NOINDEX_ROBOTS,
};

export default function EnglishMockResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
