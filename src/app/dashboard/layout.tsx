import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: NOINDEX_ROBOTS,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
