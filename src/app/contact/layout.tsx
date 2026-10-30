import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact CUETFreeMockTest",
  description:
    "Contact the CUETFreeMockTest team about mock tests, question corrections, content rights or account issues.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
