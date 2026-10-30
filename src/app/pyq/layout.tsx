import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "CUET Previous Year Questions (PYQ) — Free Practice",
  description:
    "Solve CUET (UG) previous year questions by year and subject, with answer keys, explanations and free browser-based practice.",
  path: "/pyq",
});

export default function PyqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
