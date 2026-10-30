import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "English mock test in progress",
  robots: NOINDEX_ROBOTS,
};

export default function EnglishMockTakeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
