import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Account settings",
  robots: NOINDEX_ROBOTS,
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
