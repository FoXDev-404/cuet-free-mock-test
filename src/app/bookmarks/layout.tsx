import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Bookmarked questions",
  robots: NOINDEX_ROBOTS,
};

export default function BookmarksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
