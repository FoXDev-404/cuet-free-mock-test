import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "CUET Practice Questions — Topic-wise Free Practice",
  description:
    "Practise CUET (UG) questions topic by topic with instant feedback, explanations and a personal attempt history. Free and browser-based.",
  path: "/practice",
});

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
