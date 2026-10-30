import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Incorrect answers",
  robots: NOINDEX_ROBOTS,
};

export default function IncorrectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
