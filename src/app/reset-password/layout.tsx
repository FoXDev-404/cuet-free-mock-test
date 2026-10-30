import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reset password",
  robots: NOINDEX_ROBOTS,
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
