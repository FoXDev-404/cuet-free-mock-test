import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mock test in progress",
  robots: NOINDEX_ROBOTS,
};

export default function TakeTestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
